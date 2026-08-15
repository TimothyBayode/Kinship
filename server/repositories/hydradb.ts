import type { AppConfig } from "../config.js";
import type { CreateUser, Family, KinshipRepository, Membership, Session, SourceChunk, User } from "../domain.js";
import { HydraDbClient } from "./hydradb-client.js";

export class HydraDbRepository implements KinshipRepository {
  private readonly client: HydraDbClient;
  constructor(config: AppConfig) { this.client = new HydraDbClient(config); }
  health() { return this.client.health(); }

  async createUser(user: CreateUser) {
    const existing = await this.findUserByEmail(user.email);
    if (existing) throw new Error("EMAIL_EXISTS");
    await this.upsertVertex("User", { ...user, emailVerified: false });
    return { ...user, emailVerified: false };
  }

  async findUserByEmail(email: string) {
    return this.readUser("MATCH (u:User) WHERE u.email = $email RETURN u.appId AS id, u.vertexId AS vertexId, u.email AS email, u.name AS name, u.passwordHash AS passwordHash, u.emailVerified AS emailVerified, u.createdAt AS createdAt LIMIT 1", { email });
  }

  async findUserById(id: string) {
    return this.readUser("MATCH (u:User) WHERE u.appId = $id RETURN u.appId AS id, u.vertexId AS vertexId, u.email AS email, u.name AS name, u.passwordHash AS passwordHash, u.emailVerified AS emailVerified, u.createdAt AS createdAt LIMIT 1", { id });
  }

  async verifyUser(id: string) {
    await this.client.query("MATCH (u:User) WHERE u.appId = $id SET u.emailVerified = true", { id });
  }

  async updateUserPassword(id: string, passwordHash: string) {
    await this.client.query("MATCH (u:User) WHERE u.appId = $id SET u.passwordHash = $passwordHash", { id, passwordHash });
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
    await this.client.query("MATCH (u:User {id: $userVertex}), (f:Family {id: $familyVertex}) CREATE (u)-[:MEMBER_OF {id: $relationshipId, role: $role, userId: $userId, familyId: $familyId}]->(f)", {
      userVertex: user.vertexId,
      familyVertex: family.vertexId,
      relationshipId: randomVertexId(),
      role: membership.role,
      userId: membership.userId,
      familyId: membership.familyId,
    });
    return family;
  }

  async listFamiliesForUser(userId: string) {
    const rows = await this.client.query("MATCH (u:User)-[m:MEMBER_OF]->(f:Family) WHERE u.appId = $userId RETURN f.appId AS id, f.vertexId AS vertexId, f.name AS name, f.createdBy AS createdBy, f.createdAt AS createdAt, m.role AS role", { userId });
    return rows as Array<Family & { role: Membership["role"] }>;
  }

  async findFamilyForUser(userId: string, familyId: string) {
    return (await this.listFamiliesForUser(userId)).find((family) => family.id === familyId) ?? null;
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
