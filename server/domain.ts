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
  vertexId: number;
  title: string;
  content: string;
  sourceId: string;
  familyId: string;
  createdAt: string;
  sourceType: "memory" | "event" | "file" | "person";
  sourceUrl: string;
  detail: string;
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

export type FamilyEvent = {
  id: string;
  vertexId: number;
  familyId: string;
  title: string;
  description: string;
  category: "Birthday" | "Gathering" | "Anniversary" | "Other";
  eventDate: string;
  location: string;
  imageUrl: string;
  createdBy: string;
  createdAt: string;
};

export type FamilyFileRecord = {
  id: string;
  vertexId: number;
  familyId: string;
  name: string;
  description: string;
  mimeType: string;
  fileType: "PDF" | "Audio" | "Spreadsheet" | "Document" | "Image" | "Video" | "Other";
  sizeBytes: number;
  url: string;
  uploadedBy: string;
  uploaderName: string;
  createdAt: string;
};

export type ChatSource = {
  id: string;
  title: string;
  detail: string;
  type: "document" | "audio" | "photo";
  excerpt: string;
  url: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  sources?: ChatSource[];
  error?: boolean;
};

export type ChatConversation = {
  id: string;
  vertexId: number;
  familyId: string;
  userId: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  messages: ChatMessage[];
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
  appendMemoryPhotos(userId: string, familyId: string, memoryId: string, photos: string[]): Promise<MemoryAlbum | null>;
  createFamilyEvent(event: FamilyEvent): Promise<FamilyEvent>;
  listFamilyEvents(userId: string, familyId: string): Promise<FamilyEvent[]>;
  createFamilyFile(file: FamilyFileRecord): Promise<FamilyFileRecord>;
  listFamilyFiles(userId: string, familyId: string): Promise<FamilyFileRecord[]>;
  renameFamilyFile(userId: string, familyId: string, fileId: string, name: string): Promise<FamilyFileRecord | null>;
  createSourceChunk(chunk: SourceChunk): Promise<SourceChunk>;
  listSourceChunks(familyId: string, limit: number): Promise<SourceChunk[]>;
  saveConversation(conversation: ChatConversation): Promise<ChatConversation>;
  listConversations(userId: string, familyId: string): Promise<ChatConversation[]>;
  deleteConversation(userId: string, familyId: string, conversationId: string): Promise<void>;
}
