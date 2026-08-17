export type User = {
  id: string;
  vertexId: number;
  email: string;
  name: string;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: string;
  gender: string;
  phone: string;
  birthday: string;
  profileComplete: boolean;
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
  pictureUrl: string;
  inviteCode: string;
};

export type Membership = {
  userId: string;
  familyId: string;
  role: "owner" | "admin" | "member";
  relationship: string;
};

export type Invitation = {
  id: string;
  vertexId: number;
  code: string;
  familyId: string;
  familyName: string;
  invitedBy: string;
  inviterName: string;
  invitedEmail: string;
  relationship: string;
  expiresAt: string;
  createdAt: string;
};

export type FamilyMember = Pick<User, "id" | "name" | "email" | "gender" | "birthday"> & {
  role: Membership["role"];
  relationship: string;
};

export type SourceChunk = {
  id: string;
  title: string;
  content: string;
  sourceId: string;
  familyId: string;
  createdAt: string;
};

export type MemoryAlbum = {
  id: string;
  vertexId: number;
  familyId: string;
  title: string;
  description: string;
  memoryDate: string;
  createdBy: string;
  createdAt: string;
  photos: string[];
};

export type CreateUser = Pick<User, "id" | "vertexId" | "email" | "name" | "passwordHash" | "createdAt">;

export interface KinshipRepository {
  health(): Promise<void>;
  createUser(user: CreateUser): Promise<User>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  verifyUser(id: string): Promise<void>;
  updateUserPassword(id: string, passwordHash: string): Promise<void>;
  updateUserProfile(id: string, profile: Pick<User, "gender" | "phone" | "birthday">): Promise<User>;
  createSession(session: Session): Promise<void>;
  findSession(tokenHash: string): Promise<Session | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteExpiredSessions(now: string): Promise<void>;
  createFamily(family: Family, membership: Membership): Promise<Family>;
  setFamilyInviteCode(familyId: string, inviteCode: string): Promise<void>;
  findFamilyByInviteCode(inviteCode: string): Promise<Family | null>;
  joinFamily(userId: string, familyId: string, relationship: string): Promise<void>;
  listFamiliesForUser(userId: string): Promise<Array<Family & { role: Membership["role"] }>>;
  findFamilyForUser(userId: string, familyId: string): Promise<(Family & { role: Membership["role"] }) | null>;
  listFamilyMembers(userId: string, familyId: string): Promise<FamilyMember[]>;
  setMemberRelationship(userId: string, familyId: string, relativeUserId: string, relationship: string): Promise<void>;
  createInvitation(invitation: Invitation): Promise<Invitation>;
  findInvitationByCode(code: string): Promise<Invitation | null>;
  createMemoryAlbum(album: MemoryAlbum): Promise<MemoryAlbum>;
  listMemoryAlbums(userId: string, familyId: string): Promise<MemoryAlbum[]>;
  listSourceChunks(familyId: string, limit: number): Promise<SourceChunk[]>;
}
