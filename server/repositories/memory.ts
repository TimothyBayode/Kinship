import type { ChatConversation, CreateUser, Family, FamilyEvent, FamilyFileRecord, FamilyMember, Invitation, KinshipRepository, Membership, MemoryAlbum, Session, SourceChunk, User } from "../domain.js";

export class MemoryRepository implements KinshipRepository {
  private users = new Map<string, User>();
  private sessions = new Map<string, Session>();
  private families = new Map<string, Family>();
  private memberships: Membership[] = [];
  private sourceChunks: SourceChunk[] = [];
  private invitations = new Map<string, Invitation>();
  private relationships = new Map<string, string>();
  private memoryAlbums = new Map<string, MemoryAlbum>();
  private familyEvents = new Map<string, FamilyEvent>();
  private familyFiles = new Map<string, FamilyFileRecord>();
  private conversations = new Map<string, ChatConversation>();

  async health() {}

  async createUser(input: CreateUser) {
    if ([...this.users.values()].some((user) => user.email === input.email)) throw new Error("EMAIL_EXISTS");
    const user: User = { ...input, emailVerified: false, gender: "", phone: "", birthday: "", profileComplete: false };
    this.users.set(user.id, user);
    return structuredClone(user);
  }

  async findUserByEmail(email: string) {
    return structuredClone([...this.users.values()].find((user) => user.email === email) ?? null);
  }

  async findUserById(id: string) {
    return structuredClone(this.users.get(id) ?? null);
  }

  async verifyUser(id: string) {
    const user = this.users.get(id);
    if (user) this.users.set(id, { ...user, emailVerified: true });
  }

  async updateUserPassword(id: string, passwordHash: string) {
    const user = this.users.get(id);
    if (user) this.users.set(id, { ...user, passwordHash });
  }

  async updateUserProfile(id: string, profile: Pick<User, "gender" | "phone" | "birthday">) {
    const user = this.users.get(id);
    if (!user) throw new Error("USER_NOT_FOUND");
    const updated = { ...user, ...profile, profileComplete: true };
    this.users.set(id, updated);
    return structuredClone(updated);
  }

  async createSession(session: Session) {
    this.sessions.set(session.tokenHash, structuredClone(session));
  }

  async findSession(tokenHash: string) {
    return structuredClone(this.sessions.get(tokenHash) ?? null);
  }

  async deleteSession(tokenHash: string) {
    this.sessions.delete(tokenHash);
  }

  async deleteExpiredSessions(now: string) {
    for (const [token, session] of this.sessions) if (session.expiresAt <= now) this.sessions.delete(token);
  }

  async createFamily(family: Family, membership: Membership) {
    this.families.set(family.id, structuredClone(family));
    this.memberships.push(structuredClone(membership));
    return structuredClone(family);
  }

  async setFamilyInviteCode(familyId: string, inviteCode: string) {
    const family = this.families.get(familyId);
    if (family) this.families.set(familyId, { ...family, inviteCode });
  }

  async findFamilyByInviteCode(inviteCode: string) {
    return structuredClone([...this.families.values()].find((family) => family.inviteCode === inviteCode) ?? null);
  }

  async joinFamily(userId: string, familyId: string, relationship: string) {
    if (!this.users.has(userId) || !this.families.has(familyId)) throw new Error("NOT_FOUND");
    if (!this.memberships.some((item) => item.userId === userId && item.familyId === familyId)) {
      this.memberships.push({ userId, familyId, role: "member", relationship });
    }
  }

  async listFamiliesForUser(userId: string) {
    return this.memberships.filter((item) => item.userId === userId).flatMap((item) => {
      const family = this.families.get(item.familyId);
      return family ? [{ ...structuredClone(family), role: item.role }] : [];
    });
  }

  async findFamilyForUser(userId: string, familyId: string) {
    return (await this.listFamiliesForUser(userId)).find((family) => family.id === familyId) ?? null;
  }

  async listFamilyMembers(userId: string, familyId: string) {
    if (!(await this.findFamilyForUser(userId, familyId))) return [];
    return this.memberships.filter((item) => item.familyId === familyId).flatMap((item) => {
      const member = this.users.get(item.userId);
      return member ? [{ id: member.id, name: member.name, email: member.email, gender: member.gender, birthday: member.birthday, role: item.role, relationship: this.relationships.get(`${userId}:${item.userId}:${familyId}`) ?? item.relationship }] satisfies FamilyMember[] : [];
    });
  }

  async setMemberRelationship(userId: string, familyId: string, relativeUserId: string, relationship: string) {
    if (!(await this.findFamilyForUser(userId, familyId))) throw new Error("FAMILY_NOT_FOUND");
    this.relationships.set(`${userId}:${relativeUserId}:${familyId}`, relationship);
  }

  async createInvitation(invitation: Invitation) {
    this.invitations.set(invitation.code, structuredClone(invitation));
    return structuredClone(invitation);
  }

  async findInvitationByCode(code: string) {
    return structuredClone(this.invitations.get(code) ?? null);
  }

  async createMemoryAlbum(album: MemoryAlbum) {
    this.memoryAlbums.set(album.id, structuredClone(album));
    return structuredClone(album);
  }

  async listMemoryAlbums(userId: string, familyId: string) {
    if (!(await this.findFamilyForUser(userId, familyId))) return [];
    return structuredClone([...this.memoryAlbums.values()].filter((album) => album.familyId === familyId));
  }

  async appendMemoryPhotos(userId: string, familyId: string, memoryId: string, photos: string[]) {
    if (!(await this.findFamilyForUser(userId, familyId))) return null;
    const album = this.memoryAlbums.get(memoryId);
    if (!album || album.familyId !== familyId) return null;
    const updated = { ...album, photos: [...album.photos, ...photos] };
    this.memoryAlbums.set(memoryId, updated);
    return structuredClone(updated);
  }

  async createFamilyEvent(event: FamilyEvent) {
    this.familyEvents.set(event.id, structuredClone(event));
    return structuredClone(event);
  }

  async listFamilyEvents(userId: string, familyId: string) {
    if (!(await this.findFamilyForUser(userId, familyId))) return [];
    return structuredClone([...this.familyEvents.values()].filter((event) => event.familyId === familyId));
  }

  async createFamilyFile(file: FamilyFileRecord) {
    this.familyFiles.set(file.id, structuredClone(file));
    return structuredClone(file);
  }

  async listFamilyFiles(userId: string, familyId: string) {
    if (!(await this.findFamilyForUser(userId, familyId))) return [];
    return structuredClone([...this.familyFiles.values()].filter((file) => file.familyId === familyId));
  }

  async renameFamilyFile(userId: string, familyId: string, fileId: string, name: string) {
    if (!(await this.findFamilyForUser(userId, familyId))) return null;
    const file = this.familyFiles.get(fileId);
    if (!file || file.familyId !== familyId) return null;
    const updated = { ...file, name };
    this.familyFiles.set(fileId, updated);
    return structuredClone(updated);
  }

  async createSourceChunk(chunk: SourceChunk) {
    this.sourceChunks.push(structuredClone(chunk));
    return structuredClone(chunk);
  }

  async saveConversation(conversation: ChatConversation) {
    this.conversations.set(conversation.id, structuredClone(conversation));
    return structuredClone(conversation);
  }

  async listConversations(userId: string, familyId: string) {
    return structuredClone([...this.conversations.values()].filter((item) => item.userId === userId && item.familyId === familyId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }

  async deleteConversation(userId: string, familyId: string, conversationId: string) {
    const conversation = this.conversations.get(conversationId);
    if (conversation?.userId === userId && conversation.familyId === familyId) this.conversations.delete(conversationId);
  }

  async listSourceChunks(familyId: string, limit: number) {
    return structuredClone(this.sourceChunks.filter((chunk) => chunk.familyId === familyId).slice(0, limit));
  }
}
