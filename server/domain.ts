export type User = {
  id: string;
  vertexId: number;
  email: string;
  name: string;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: string;
};

export type Session = {
  id: string;
  vertexId: number;
  tokenHash: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
};

export type Family = {
  id: string;
  vertexId: number;
  name: string;
  createdBy: string;
  createdAt: string;
};

export type Membership = {
  userId: string;
  familyId: string;
  role: "owner" | "admin" | "member";
};

export type SourceChunk = {
  id: string;
  title: string;
  content: string;
  sourceId: string;
  familyId: string;
  createdAt: string;
};

export type CreateUser = Pick<User, "id" | "vertexId" | "email" | "name" | "passwordHash" | "createdAt">;

export interface KinshipRepository {
  health(): Promise<void>;
  createUser(user: CreateUser): Promise<User>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  verifyUser(id: string): Promise<void>;
  updateUserPassword(id: string, passwordHash: string): Promise<void>;
  createSession(session: Session): Promise<void>;
  findSession(tokenHash: string): Promise<Session | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteExpiredSessions(now: string): Promise<void>;
  createFamily(family: Family, membership: Membership): Promise<Family>;
  listFamiliesForUser(userId: string): Promise<Array<Family & { role: Membership["role"] }>>;
  findFamilyForUser(userId: string, familyId: string): Promise<(Family & { role: Membership["role"] }) | null>;
  listSourceChunks(familyId: string, limit: number): Promise<SourceChunk[]>;
}
