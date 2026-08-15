import type { CreateUser, Family, KinshipRepository, Membership, Session, SourceChunk, User } from "../domain.js";

export class MemoryRepository implements KinshipRepository {
  private users = new Map<string, User>();
  private sessions = new Map<string, Session>();
  private families = new Map<string, Family>();
  private memberships: Membership[] = [];
  private sourceChunks: SourceChunk[] = [];

  async health() {}

  async createUser(input: CreateUser) {
    if ([...this.users.values()].some((user) => user.email === input.email)) throw new Error("EMAIL_EXISTS");
    const user: User = { ...input, emailVerified: false };
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

  async listFamiliesForUser(userId: string) {
    return this.memberships.filter((item) => item.userId === userId).flatMap((item) => {
      const family = this.families.get(item.familyId);
      return family ? [{ ...structuredClone(family), role: item.role }] : [];
    });
  }

  async findFamilyForUser(userId: string, familyId: string) {
    return (await this.listFamiliesForUser(userId)).find((family) => family.id === familyId) ?? null;
  }

  async listSourceChunks(familyId: string, limit: number) {
    return structuredClone(this.sourceChunks.filter((chunk) => chunk.familyId === familyId).slice(0, limit));
  }
}
