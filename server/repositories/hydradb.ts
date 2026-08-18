import type { AppConfig } from "../config.js";
import type { ChatConversation, CreateUser, Family, FamilyEvent, FamilyFileRecord, FamilyMember, Invitation, KinshipRepository, Membership, MemoryAlbum, Notification, Session, SourceChunk, User } from "../domain.js";
import { HydraDbClient } from "./hydradb-client.js";

export class HydraDbRepository implements KinshipRepository {
  private readonly client: HydraDbClient;
  constructor(config: AppConfig) { this.client = new HydraDbClient(config); }
  health() { return this.client.health(); }

  async createUser(user: CreateUser) {
    const existing = await this.findUserByEmail(user.email);
    if (existing) throw new Error("EMAIL_EXISTS");
    const created = { ...user, emailVerified: false, gender: "", phone: "", birthday: "", profileComplete: false, avatarUrl: "" };
    await this.upsertVertex("User", created);
    return created;
  }

  async findUserByEmail(email: string) {
    return this.readUser("MATCH (u:User) WHERE u.email = $email RETURN u.appId AS id, u.vertexId AS vertexId, u.email AS email, u.name AS name, u.passwordHash AS passwordHash, u.emailVerified AS emailVerified, u.createdAt AS createdAt, u.gender AS gender, u.phone AS phone, u.birthday AS birthday, u.profileComplete AS profileComplete, u.avatarUrl AS avatarUrl LIMIT 1", { email });
  }

  async findUserById(id: string) {
    return this.readUser("MATCH (u:User) WHERE u.appId = $id RETURN u.appId AS id, u.vertexId AS vertexId, u.email AS email, u.name AS name, u.passwordHash AS passwordHash, u.emailVerified AS emailVerified, u.createdAt AS createdAt, u.gender AS gender, u.phone AS phone, u.birthday AS birthday, u.profileComplete AS profileComplete, u.avatarUrl AS avatarUrl LIMIT 1", { id });
  }

  async verifyUser(id: string) {
    await this.client.query("MATCH (u:User) WHERE u.appId = $id SET u.emailVerified = true", { id });
  }

  async updateUserPassword(id: string, passwordHash: string) {
    await this.client.query("MATCH (u:User) WHERE u.appId = $id SET u.passwordHash = $passwordHash", { id, passwordHash });
  }

  async updateUserProfile(id: string, profile: Partial<Pick<User, "name" | "gender" | "phone" | "birthday" | "avatarUrl">>) {
    const assignments = Object.keys(profile).map((key) => `u.${key} = $${key}`).join(", ");
    await this.client.query(`MATCH (u:User) WHERE u.appId = $id SET ${assignments}, u.profileComplete = true`, { id, ...profile });
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

  async setFamilyInviteCode(familyId: string, inviteCode: string) {
    await this.client.query("MATCH (f:Family) WHERE f.appId = $familyId SET f.inviteCode = $inviteCode", { familyId, inviteCode });
  }

  async findFamilyByInviteCode(inviteCode: string) {
    const [row] = await this.client.query("MATCH (f:Family) WHERE f.inviteCode = $inviteCode RETURN f.appId AS id, f.vertexId AS vertexId, f.name AS name, f.createdBy AS createdBy, f.createdAt AS createdAt, f.pictureUrl AS pictureUrl, f.inviteCode AS inviteCode LIMIT 1", { inviteCode });
    return row ? row as Family : null;
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
    const rows = await this.client.query("MATCH (u:User)-[m:MEMBER_OF]->(f:Family) WHERE u.appId = $userId RETURN f.appId AS id, f.vertexId AS vertexId, f.name AS name, f.createdBy AS createdBy, f.createdAt AS createdAt, f.pictureUrl AS pictureUrl, f.inviteCode AS inviteCode, m.role AS role", { userId });
    return rows as Array<Family & { role: Membership["role"] }>;
  }

  async findFamilyForUser(userId: string, familyId: string) {
    return (await this.listFamiliesForUser(userId)).find((family) => family.id === familyId) ?? null;
  }

  async listFamilyMembers(userId: string, familyId: string) {
    if (!(await this.findFamilyForUser(userId, familyId))) return [];
    const rows = await this.client.query("MATCH (u:User)-[m:MEMBER_OF]->(f:Family) WHERE f.appId = $familyId RETURN u.appId AS id, u.name AS name, u.email AS email, u.gender AS gender, u.birthday AS birthday, u.avatarUrl AS avatarUrl, m.role AS role, m.relationship AS relationship", { familyId });
    return rows as FamilyMember[];
  }

  async setMemberRelationship(userId: string, familyId: string, relativeUserId: string, relationship: string) {
    if (!(await this.findFamilyForUser(userId, familyId))) throw new Error("FAMILY_NOT_FOUND");
    const target = await this.findUserById(relativeUserId);
    if (!target) throw new Error("USER_NOT_FOUND");
    await this.client.query("MATCH (u:User)-[m:MEMBER_OF]->(f:Family) WHERE u.appId = $relativeUserId AND f.appId = $familyId SET m.relationship = $relationship", { relativeUserId, familyId, relationship });
  }

  async createInvitation(invitation: Invitation) {
    await this.upsertVertex("Invitation", invitation);
    return invitation;
  }

  async findInvitationByCode(code: string) {
    const [row] = await this.client.query("MATCH (i:Invitation) WHERE i.code = $code RETURN i.appId AS id, i.vertexId AS vertexId, i.code AS code, i.familyId AS familyId, i.familyName AS familyName, i.invitedBy AS invitedBy, i.inviterName AS inviterName, i.invitedName AS invitedName, i.invitedEmail AS invitedEmail, i.relationship AS relationship, i.expiresAt AS expiresAt, i.createdAt AS createdAt LIMIT 1", { code });
    return row ? row as Invitation : null;
  }

  async createMemoryAlbum(album: MemoryAlbum) {
    const { photos: photoUrls, ...properties } = album;
    await this.upsertVertex("Memory", { ...properties, photosJson: JSON.stringify(photoUrls) });
    const photos = photoUrls.map((url) => { const vertexId = randomVertexId(); return { vertex: vertexId, vertexId, appId: crypto.randomUUID(), url, familyId: album.familyId, createdAt: album.createdAt }; });
    await this.client.query("UNWIND $rows AS row MERGE (p {id: row.vertex}) SET p:Photo, p.vertexId = row.vertexId, p.appId = row.appId, p.url = row.url, p.familyId = row.familyId, p.createdAt = row.createdAt", { rows: photos });
    await this.client.query("UNWIND $rows AS row MATCH (m:Memory {id: row.memoryVertex}), (p:Photo {id: row.photoVertex}) CREATE (m)-[:CONTAINS {id: row.edgeId, familyId: row.familyId}]->(p)", { rows: photos.map((photo) => ({ memoryVertex: album.vertexId, photoVertex: photo.vertexId, edgeId: randomVertexId(), familyId: album.familyId })) });
    return album;
  }

  async listMemoryAlbums(userId: string, familyId: string) {
    if (!(await this.findFamilyForUser(userId, familyId))) return [];
    const rows = await this.client.query("MATCH (m:Memory) WHERE m.familyId = $familyId RETURN m.appId AS id, m.vertexId AS vertexId, m.familyId AS familyId, m.title AS title, m.description AS description, m.memoryDate AS memoryDate, m.createdBy AS createdBy, m.createdAt AS createdAt, m.photosJson AS photosJson ORDER BY m.memoryDate DESC", { familyId });
    return rows.map((row) => ({ ...row, photos: parsePhotos(row.photosJson) })) as MemoryAlbum[];
  }

  async appendMemoryPhotos(userId: string, familyId: string, memoryId: string, photoUrls: string[]) {
    if (!(await this.findFamilyForUser(userId, familyId))) return null;
    const [row] = await this.client.query("MATCH (m:Memory) WHERE m.appId = $memoryId AND m.familyId = $familyId RETURN m.vertexId AS vertexId, m.photosJson AS photosJson", { memoryId, familyId });
    if (!row) return null;
    const photosJson = [...parsePhotos(row.photosJson), ...photoUrls];
    await this.client.query("MATCH (m:Memory) WHERE m.appId = $memoryId AND m.familyId = $familyId SET m.photosJson = $photosJson", { memoryId, familyId, photosJson: JSON.stringify(photosJson) });
    const photos = photoUrls.map((url) => { const vertexId = randomVertexId(); return { vertex: vertexId, vertexId, appId: crypto.randomUUID(), url, familyId, createdAt: new Date().toISOString() }; });
    await this.client.query("UNWIND $rows AS row MERGE (p {id: row.vertex}) SET p:Photo, p.vertexId = row.vertexId, p.appId = row.appId, p.url = row.url, p.familyId = row.familyId, p.createdAt = row.createdAt", { rows: photos });
    await this.client.query("UNWIND $rows AS row MATCH (m:Memory {id: row.memoryVertex}), (p:Photo {id: row.photoVertex}) CREATE (m)-[:CONTAINS {id: row.edgeId, familyId: row.familyId}]->(p)", { rows: photos.map((photo) => ({ memoryVertex: row.vertexId, photoVertex: photo.vertexId, edgeId: randomVertexId(), familyId })) });
    return (await this.listMemoryAlbums(userId, familyId)).find((album) => album.id === memoryId) ?? null;
  }

  async createFamilyEvent(event: FamilyEvent) {
    await this.upsertVertex("Event", event);
    return event;
  }

  async listFamilyEvents(userId: string, familyId: string) {
    if (!(await this.findFamilyForUser(userId, familyId))) return [];
    const rows = await this.client.query("MATCH (e:Event) WHERE e.familyId = $familyId RETURN e.appId AS id, e.vertexId AS vertexId, e.familyId AS familyId, e.title AS title, e.description AS description, e.category AS category, e.eventDate AS eventDate, e.location AS location, e.imageUrl AS imageUrl, e.createdBy AS createdBy, e.createdAt AS createdAt ORDER BY e.eventDate", { familyId });
    return rows as FamilyEvent[];
  }

  async createFamilyFile(file: FamilyFileRecord) {
    await this.upsertVertex("File", file);
    return file;
  }

  async listFamilyFiles(userId: string, familyId: string) {
    if (!(await this.findFamilyForUser(userId, familyId))) return [];
    const rows = await this.client.query("MATCH (x:File) WHERE x.familyId = $familyId RETURN x.appId AS id, x.vertexId AS vertexId, x.familyId AS familyId, x.name AS name, x.description AS description, x.mimeType AS mimeType, x.fileType AS fileType, x.sizeBytes AS sizeBytes, x.url AS url, x.uploadedBy AS uploadedBy, x.uploaderName AS uploaderName, x.createdAt AS createdAt ORDER BY x.createdAt DESC", { familyId });
    return rows as FamilyFileRecord[];
  }

  async renameFamilyFile(userId: string, familyId: string, fileId: string, name: string) {
    if (!(await this.findFamilyForUser(userId, familyId))) return null;
    const [existing] = await this.client.query("MATCH (x:File) WHERE x.appId = $fileId AND x.familyId = $familyId RETURN x.appId AS id", { fileId, familyId });
    if (!existing) return null;
    await this.client.query("MATCH (x:File) WHERE x.appId = $fileId AND x.familyId = $familyId SET x.name = $name", { fileId, familyId, name });
    return (await this.listFamilyFiles(userId, familyId)).find((file) => file.id === fileId) ?? null;
  }

  async createSourceChunk(chunk: SourceChunk) {
    await this.upsertVertex("SourceChunk", chunk);
    return chunk;
  }

  async saveConversation(conversation: ChatConversation) {
    const [existing] = await this.client.query("MATCH (c:Conversation) WHERE c.appId = $id AND c.userId = $userId AND c.familyId = $familyId RETURN c.vertexId AS vertexId", { id: conversation.id, userId: conversation.userId, familyId: conversation.familyId });
    if (existing?.vertexId) conversation.vertexId = existing.vertexId as number;
    const { messages, ...properties } = conversation;
    await this.upsertVertex("Conversation", { ...properties, messagesJson: JSON.stringify(messages) });
    return conversation;
  }

  async listConversations(userId: string, familyId: string) {
    const rows = await this.client.query("MATCH (c:Conversation) WHERE c.userId = $userId AND c.familyId = $familyId RETURN c.appId AS id, c.vertexId AS vertexId, c.familyId AS familyId, c.userId AS userId, c.title AS title, c.updatedAt AS updatedAt, c.createdAt AS createdAt, c.messagesJson AS messagesJson ORDER BY c.updatedAt DESC", { userId, familyId });
    return rows.map((row) => ({ ...row, messages: parseMessages(row.messagesJson) })) as ChatConversation[];
  }

  async deleteConversation(userId: string, familyId: string, conversationId: string) {
    await this.client.query("MATCH (c:Conversation) WHERE c.appId = $conversationId AND c.userId = $userId AND c.familyId = $familyId DETACH DELETE c", { conversationId, userId, familyId });
  }

  async createNotification(notification: Notification) { await this.upsertVertex("Notification", notification); return notification; }
  async listNotifications(userId: string, limit: number) { const rows = await this.client.query("MATCH (n:Notification) WHERE n.recipientId = $userId RETURN n.appId AS id, n.vertexId AS vertexId, n.recipientId AS recipientId, n.familyId AS familyId, n.actorId AS actorId, n.actorName AS actorName, n.type AS type, n.title AS title, n.message AS message, n.target AS target, n.read AS read, n.createdAt AS createdAt ORDER BY n.createdAt DESC LIMIT $limit", { userId, limit }); return rows as Notification[]; }
  async markAllNotificationsRead(userId: string) { await this.client.query("MATCH (n:Notification) WHERE n.recipientId = $userId SET n.read = true", { userId }); }

  async listSourceChunks(familyId: string, limit: number) {
    const rows = await this.client.query("MATCH (c:SourceChunk) WHERE c.familyId = $familyId RETURN c.appId AS id, c.vertexId AS vertexId, c.title AS title, c.content AS content, c.sourceId AS sourceId, c.familyId AS familyId, c.createdAt AS createdAt, c.sourceType AS sourceType, c.sourceUrl AS sourceUrl, c.detail AS detail ORDER BY c.createdAt DESC LIMIT $limit", { familyId, limit });
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

function parsePhotos(value: unknown) {
  if (typeof value !== "string") return [];
  try { return JSON.parse(value) as string[]; } catch { return []; }
}

function parseMessages(value: unknown) {
  if (typeof value !== "string") return [];
  try { return JSON.parse(value) as ChatConversation["messages"]; } catch { return []; }
}

export function randomVertexId() {
  return Number(BigInt(`0x${crypto.randomUUID().replaceAll("-", "").slice(0, 13)}`));
}
