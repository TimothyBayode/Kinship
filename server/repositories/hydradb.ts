import type { AppConfig } from "../config.js";
import type { CreateUser, Family, FamilyMember, Invitation, KinshipRepository, Membership, Session, SourceChunk, User } from "../domain.js";
import { HydraDbClient } from "./hydradb-client.js";

export class HydraDbRepository implements KinshipRepository {
  private readonly client: HydraDbClient;
  constructor(config: AppConfig) { this.client = new HydraDbClient(config); }
  health() { return this.client.health(); }

  async createUser(user: CreateUser) {
    const existing = await this.findUserByEmail(user.email);
    if (existing) throw new Error("EMAIL_EXISTS");
    const created = { ...user, emailVerified: false, gender: "", phone: "", birthday: "", profileComplete: false };
    await this.upsertVertex("User", created);
    return created;
  }

  async findUserByEmail(email: string) {
    return this.readUser("MATCH (u:User) WHERE u.email = $email RETURN u.appId AS id, u.vertexId AS vertexId, u.email AS email, u.name AS name, u.passwordHash AS passwordHash, u.emailVerified AS emailVerified, u.createdAt AS createdAt, u.gender AS gender, u.phone AS phone, u.birthday AS birthday, u.profileComplete AS profileComplete LIMIT 1", { email });
  }

  async findUserById(id: string) {
    return this.readUser("MATCH (u:User) WHERE u.appId = $id RETURN u.appId AS id, u.vertexId AS vertexId, u.email AS email, u.name AS name, u.passwordHash AS passwordHash, u.emailVerified AS emailVerified, u.createdAt AS createdAt, u.gender AS gender, u.phone AS phone, u.birthday AS birthday, u.profileComplete AS profileComplete LIMIT 1", { id });
  }

  async verifyUser(id: string) {
    await this.client.query("MATCH (u:User) WHERE u.appId = $id SET u.emailVerified = true", { id });
  }

  async updateUserPassword(id: string, passwordHash: string) {
    await this.client.query("MATCH (u:User) WHERE u.appId = $id SET u.passwordHash = $passwordHash", { id, passwordHash });
  }

  async updateUserProfile(id: string, profile: Pick<User, "gender" | "phone" | "birthday">) {
    await this.client.query("MATCH (u:User) WHERE u.appId = $id SET u.gender = $gender, u.phone = $phone, u.birthday = $birthday, u.profileComplete = true", { id, ...profile });
    const user = await this.findUserById(id);
    if (!user) throw new Error("USER_NOT_FOUND");
    return user;
  }

  async createSession(session: Session) { await this.upsertVertex("Session", session); }

  async findSession(tokenHash: string) {
    const [row] = await this.client.query("MATCH (s:Session) WHERE s.tokenHash = $tokenHash RETURN s.appId AS id, s.vertexId AS vertexId, s.tokenHash AS tokenHash, s.userId AS userId, s.expiresAt AS expiresAt, s.createdAt AS createdAt LIMIT 1", { tokenHash });
    return row ? row as Session : null;
  }

  async deleteSession(tokenHash: string) { await this.client.query("MATCH (s:Session) WHERE s.tokenHash = $tokenHash DETACH DELETE s", { tokenHash }); }

  async deleteExpiredSessions(now: string) {
    const rows = await this.client.query("MATCH (s:Session) WHERE s.expiresAt < $now RETURN s.appId AS id", { now });
    for (const row of rows) await this.client.query("MATCH (s:Session) WHERE s.appId = $id DETACH DELETE s", { id: row.id });
  }

  async createFamily(family: Family, membership: Membership) {
    await this.upsertVertex("Family", family);
    const user = await this.findUserById(membership.userId);
    if (!user) throw new Error("USER_NOT_FOUND");
    await this.client.query("UNWIND $rows AS row MATCH (u:User {id: row.userVertex}), (f:Family {id: row.familyVertex}) CREATE (u)-[:MEMBER_OF {id: row.relationshipId, role: row.role, relationship: row.relationship, userId: row.userId, familyId: row.familyId}]->(f)", { rows: [{
      userVertex: user.vertexId, familyVertex: family.vertexId, relationshipId: randomVertexId(), role: membership.role,
      relationship: membership.relationship, userId: membership.userId, familyId: membership.familyId,
    }] });
    return family;
  }

  async joinFamily(userId: string, familyId: string, relationship: string) {
    if (await this.findFamilyForUser(userId, familyId)) return;
    const user = await this.findUserById(userId);
    const [family] = await this.client.query("MATCH (f:Family) WHERE f.appId = $familyId RETURN f.vertexId AS vertexId", { familyId });
    if (!user || !family) throw new Error("NOT_FOUND");
    await this.client.query("UNWIND $rows AS row MATCH (u:User {id: row.userVertex}), (f:Family {id: row.familyVertex}) CREATE (u)-[:MEMBER_OF {id: row.relationshipId, role: row.role, relationship: row.relationship, userId: row.userId, familyId: row.familyId}]->(f)", { rows: [{
      userVertex: user.vertexId, familyVertex: family.vertexId, relationshipId: randomVertexId(), role: "member", relationship, userId, familyId,
    }] });
  }

  async listFamiliesForUser(userId: string) {
    const rows = await this.client.query("MATCH (u:User)-[m:MEMBER_OF]->(f:Family) WHERE u.appId = $userId RETURN f.appId AS id, f.vertexId AS vertexId, f.name AS name, f.createdBy AS createdBy, f.createdAt AS createdAt, m.role AS role", { userId });
    return rows as Array<Family & { role: Membership["role"] }>;
  }

  async findFamilyForUser(userId: string, familyId: string) {
    return (await this.listFamiliesForUser(userId)).find((family) => family.id === familyId) ?? null;
  }

  async listFamilyMembers(userId: string, familyId: string) {
    if (!(await this.findFamilyForUser(userId, familyId))) return [];
    const rows = await this.client.query("MATCH (u:User)-[m:MEMBER_OF]->(f:Family) WHERE f.appId = $familyId RETURN u.appId AS id, u.name AS name, u.email AS email, u.gender AS gender, u.birthday AS birthday, m.role AS role, m.relationship AS relationship", { familyId });
    return rows as FamilyMember[];
  }

  async setMemberRelationship(userId: string, familyId: string, relativeUserId: string, relationship: string) {
    if (!(await this.findFamilyForUser(userId, familyId))) throw new Error("FAMILY_NOT_FOUND");
    const source = await this.findUserById(userId);
    const target = await this.findUserById(relativeUserId);
    if (!source || !target) throw new Error("USER_NOT_FOUND");
    const [existing] = await this.client.query("MATCH (u:User)-[r:RELATED_TO]->(v:User) WHERE u.appId = $userId AND v.appId = $relativeUserId AND r.familyId = $familyId RETURN r.id AS id", { userId, relativeUserId, familyId });
    if (existing) {
      await this.client.query("MATCH (u:User)-[r:RELATED_TO]->(v:User) WHERE u.appId = $userId AND v.appId = $relativeUserId AND r.familyId = $familyId SET r.relationship = $relationship", { userId, relativeUserId, familyId, relationship });
      return;
    }
    await this.client.query("UNWIND $rows AS row MATCH (u:User {id: row.sourceVertex}), (v:User {id: row.targetVertex}) CREATE (u)-[:RELATED_TO {id: row.edgeId, familyId: row.familyId, relationship: row.relationship}]->(v)", { rows: [{ sourceVertex: source.vertexId, targetVertex: target.vertexId, edgeId: randomVertexId(), familyId, relationship }] });
  }

  async createInvitation(invitation: Invitation) {
    await this.upsertVertex("Invitation", invitation);
    return invitation;
  }

  async findInvitationByCode(code: string) {
    const [row] = await this.client.query("MATCH (i:Invitation) WHERE i.code = $code RETURN i.appId AS id, i.vertexId AS vertexId, i.code AS code, i.familyId AS familyId, i.familyName AS familyName, i.invitedBy AS invitedBy, i.inviterName AS inviterName, i.invitedEmail AS invitedEmail, i.relationship AS relationship, i.expiresAt AS expiresAt, i.createdAt AS createdAt LIMIT 1", { code });
    return row ? row as Invitation : null;
  }

  async listSourceChunks(familyId: string, limit: number) {
    const rows = await this.client.query("MATCH (c:SourceChunk) WHERE c.familyId = $familyId RETURN c.appId AS id, c.title AS title, c.content AS content, c.sourceId AS sourceId, c.familyId AS familyId, c.createdAt AS createdAt ORDER BY c.createdAt DESC LIMIT $limit", { familyId, limit });
    return rows as SourceChunk[];
  }

  private async upsertVertex(label: string, properties: Record<string, unknown>) {
    await this.client.query(`UNWIND $rows AS row MERGE (n {id: row.vertex}) SET n:${label}, n.vertexId = row.vertexId, n.appId = row.appId${Object.keys(properties).filter((key) => !["vertexId", "id"].includes(key)).map((key) => `, n.${key} = row.${key}`).join("")}`, { rows: [{ vertex: properties.vertexId, appId: properties.id, ...properties }] });
  }

  private async readUser(query: string, parameters: Record<string, unknown>) {
    const [row] = await this.client.query(query, parameters);
    return row ? row as User : null;
  }
}

export function randomVertexId() {
  return Number(BigInt(`0x${crypto.randomUUID().replaceAll("-", "").slice(0, 13)}`));
}
