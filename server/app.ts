import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { z, ZodError } from "zod";
import type { AppConfig } from "./config.js";
import type { KinshipRepository } from "./domain.js";
import { randomVertexId } from "./repositories/hydradb.js";
import { AiService } from "./services/ai.js";
import { AuthError, AuthService } from "./services/auth.js";
import { CloudinaryService } from "./services/cloudinary.js";
import { EmailService } from "./services/email.js";
import { RetrievalService } from "./services/retrieval.js";
import { SupabaseAuthService } from "./services/supabase.js";

const credentialsSchema = z.object({ email: z.email(), password: z.string().min(8).max(128) });
const registerSchema = credentialsSchema.extend({ name: z.string().trim().min(2).max(80) });
const tokenSchema = z.object({ token: z.string().min(20) });
const familySchema = z.object({ name: z.string().trim().min(2).max(100), pictureUrl: z.union([z.url(), z.literal("")]).optional().default("") });
const chatSchema = z.object({ familyId: z.uuid(), question: z.string().trim().min(1).max(8_000) });
const profileSchema = z.object({ gender: z.enum(["female", "male", "non-binary", "prefer-not-to-say"]), phone: z.string().trim().min(7).max(30), birthday: z.iso.date() });
const invitationSchema = z.object({ familyId: z.uuid(), email: z.union([z.email(), z.literal("")]).optional().default(""), relationship: z.string().trim().min(2).max(60) });
const inviteCodeSchema = z.object({ code: z.string().trim().min(6).max(20).transform((value) => value.toUpperCase()) });
const relationshipSchema = z.object({ relationship: z.string().trim().min(2).max(60) });
const memorySchema = z.object({ familyId: z.uuid(), title: z.string().trim().min(2).max(120), description: z.string().trim().max(4_000), memoryDate: z.iso.date(), photos: z.array(z.url()).min(1).max(50) });
const memoryPhotosSchema = z.object({ familyId: z.uuid(), photos: z.array(z.url()).min(1).max(50) });
const eventSchema = z.object({ familyId: z.uuid(), title: z.string().trim().min(2).max(120), description: z.string().trim().max(4_000), category: z.enum(["Birthday", "Gathering", "Anniversary", "Other"]), eventDate: z.iso.date(), location: z.string().trim().max(200), imageUrl: z.union([z.url(), z.literal("")]).default("") });
const fileSchema = z.object({ familyId: z.uuid(), name: z.string().trim().min(1).max(240), description: z.string().trim().max(4_000), mimeType: z.string().trim().max(200), fileType: z.enum(["PDF", "Audio", "Spreadsheet", "Document", "Image", "Video", "Other"]), sizeBytes: z.number().int().nonnegative(), url: z.url() });

export async function buildApp(config: AppConfig, repository: KinshipRepository) {
  const app = Fastify({ logger: config.NODE_ENV !== "test", trustProxy: config.NODE_ENV === "production" });
  const auth = new AuthService(repository, config);
  const email = new EmailService(config);
  const cloudinary = new CloudinaryService(config);
  const ai = new AiService(config);
  const retrieval = new RetrievalService(repository);
  const supabase = new SupabaseAuthService(config);

  await app.register(cookie);
  await app.register(cors, { origin: config.APP_ORIGIN, credentials: true, methods: ["GET", "POST", "DELETE", "OPTIONS"] });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

  app.addHook("onRequest", async (request, reply) => {
    if (config.NODE_ENV === "development" || ["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
    const origin = request.headers.origin;
    if (origin && origin !== config.APP_ORIGIN) {
      request.log.warn({ receivedOrigin: origin, expectedOrigin: config.APP_ORIGIN }, "request origin is not allowed");
      return reply.code(403).send({
        error: {
          code: "ORIGIN_NOT_ALLOWED",
          message: "Request origin is not allowed",
        },
      });
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    const message = error instanceof Error ? error.message : "";
    if (error instanceof ZodError) return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Request data is invalid", details: error.issues } });
    if (error instanceof AuthError) return reply.code(error.statusCode).send({ error: { code: error.code, message: authMessage(error.code) } });
    if (message === "EMAIL_EXISTS") return reply.code(409).send({ error: { code: "EMAIL_EXISTS", message: "An account with this email already exists" } });
    if ((error as { code?: string }).code === "FST_ERR_CTP_INVALID_MEDIA_TYPE") return reply.code(415).send({ error: { code: "INVALID_CONTENT_TYPE", message: "Use application/json" } });
    app.log.error(error);
    return reply.code(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: config.NODE_ENV === "development" && error instanceof Error ? error.message : "The request could not be completed",
      },
    });
  });

  app.get("/api/health", async () => {
    await repository.health();
    return { status: "ok", dataProvider: config.DATA_PROVIDER, supabaseAuth: supabase.enabled };
  });

  app.post("/api/auth/sync", async (request, reply) => {
    const user = await requireUser(request, reply, auth, supabase, repository, config);
    return user ? { user } : undefined;
  });

  app.patch("/api/profile", async (request, reply) => {
    const user = await requireUser(request, reply, auth, supabase, repository, config);
    if (!user) return;
    const updated = await repository.updateUserProfile(user.id, profileSchema.parse(request.body));
    return { user: toPublicUser(updated) };
  });

  app.post("/api/auth/register", { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } }, async (request, reply) => {
    const input = registerSchema.parse(request.body);
    const { user, verificationToken } = await auth.register(input);
    const delivery = await email.sendVerification(user.email, verificationToken);
    return reply.code(201).send({ user, emailDelivery: delivery });
  });

  app.post("/api/auth/login", { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } }, async (request, reply) => {
    const input = credentialsSchema.parse(request.body);
    const result = await auth.login(input.email, input.password);
    setSessionCookie(reply, config, result.token, result.expiresAt);
    return { user: result.user };
  });

  app.post("/api/auth/logout", async (request, reply) => {
    await auth.logout(request.cookies[config.SESSION_COOKIE_NAME]);
    reply.clearCookie(config.SESSION_COOKIE_NAME, sessionCookieOptions(config));
    return reply.code(204).send();
  });

  app.get("/api/auth/me", async (request, reply) => {
    const user = await getAuthenticatedUser(request, auth, supabase, repository, config);
    return user ? { user } : reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "Authentication is required" } });
  });

  app.post("/api/auth/verify-email", async (request, reply) => {
    await auth.verifyEmail(tokenSchema.parse(request.body).token);
    return reply.code(204).send();
  });

  app.post("/api/auth/forgot-password", { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } }, async (request, reply) => {
    const emailAddress = z.object({ email: z.email() }).parse(request.body).email;
    const token = await auth.createPasswordReset(emailAddress);
    if (token) await email.sendPasswordReset(emailAddress, token);
    return reply.code(202).send({ message: "If that account exists, a reset email has been sent." });
  });

  app.post("/api/auth/reset-password", async (request, reply) => {
    const input = tokenSchema.extend({ password: z.string().min(8).max(128) }).parse(request.body);
    await auth.resetPassword(input.token, input.password);
    return reply.code(204).send();
  });

  app.get("/api/families", async (request, reply) => {
    const user = await requireUser(request, reply, auth, supabase, repository, config);
    if (!user) return;
    const families = await repository.listFamiliesForUser(user.id);
    for (const family of families) {
      if (!family.inviteCode) {
        family.inviteCode = createInviteCode();
        await repository.setFamilyInviteCode(family.id, family.inviteCode);
      }
    }
    return { families };
  });

  app.post("/api/families", async (request, reply) => {
    const user = await requireUser(request, reply, auth, supabase, repository, config);
    if (!user) return;
    const input = familySchema.parse(request.body);
    const family = { id: crypto.randomUUID(), vertexId: randomVertexId(), name: input.name, createdBy: user.id, createdAt: new Date().toISOString(), pictureUrl: input.pictureUrl, inviteCode: createInviteCode() };
    await repository.createFamily(family, { userId: user.id, familyId: family.id, role: "owner", relationship: "Steward" });
    return reply.code(201).send({ family });
  });

  app.get("/api/families/:familyId/members", async (request, reply) => {
    const user = await requireUser(request, reply, auth, supabase, repository, config);
    if (!user) return;
    const { familyId } = z.object({ familyId: z.uuid() }).parse(request.params);
    return { members: await repository.listFamilyMembers(user.id, familyId) };
  });

  app.post("/api/families/:familyId/invite-code", async (request, reply) => {
    const user = await requireUser(request, reply, auth, supabase, repository, config);
    if (!user) return;
    const { familyId } = z.object({ familyId: z.uuid() }).parse(request.params);
    const family = await repository.findFamilyForUser(user.id, familyId);
    if (!family) return reply.code(404).send({ error: { code: "FAMILY_NOT_FOUND", message: "Family was not found" } });
    if (!family.inviteCode) {
      family.inviteCode = createInviteCode();
      await repository.setFamilyInviteCode(family.id, family.inviteCode);
    }
    return { inviteCode: family.inviteCode };
  });

  app.post("/api/families/join", async (request, reply) => {
    const user = await requireUser(request, reply, auth, supabase, repository, config);
    if (!user) return;
    const code = inviteCodeSchema.parse(request.body).code;
    const family = await repository.findFamilyByInviteCode(code);
    if (!family) return reply.code(404).send({ error: { code: "INVITATION_NOT_FOUND", message: "This family invite code is invalid" } });
    await repository.joinFamily(user.id, family.id, "Relative");
    return { familyId: family.id };
  });

  app.get("/api/memories", async (request, reply) => {
    const user = await requireUser(request, reply, auth, supabase, repository, config);
    if (!user) return;
    const familyId = z.object({ familyId: z.uuid() }).parse(request.query).familyId;
    return { memories: await repository.listMemoryAlbums(user.id, familyId) };
  });

  app.post("/api/memories", async (request, reply) => {
    const user = await requireUser(request, reply, auth, supabase, repository, config);
    if (!user) return;
    const input = memorySchema.parse(request.body);
    if (!(await repository.findFamilyForUser(user.id, input.familyId))) return reply.code(404).send({ error: { code: "FAMILY_NOT_FOUND", message: "Family was not found" } });
    const album = { id: crypto.randomUUID(), vertexId: randomVertexId(), ...input, createdBy: user.id, createdAt: new Date().toISOString() };
    return reply.code(201).send({ memory: await repository.createMemoryAlbum(album) });
  });

  app.post("/api/memories/:memoryId/photos", async (request, reply) => {
    const user = await requireUser(request, reply, auth, supabase, repository, config);
    if (!user) return;
    const { memoryId } = z.object({ memoryId: z.uuid() }).parse(request.params);
    const input = memoryPhotosSchema.parse(request.body);
    const memory = await repository.appendMemoryPhotos(user.id, input.familyId, memoryId, input.photos);
    return memory ? { memory } : reply.code(404).send({ error: { code: "MEMORY_NOT_FOUND", message: "Memory was not found" } });
  });

  app.get("/api/events", async (request, reply) => {
    const user = await requireUser(request, reply, auth, supabase, repository, config);
    if (!user) return;
    const familyId = z.object({ familyId: z.uuid() }).parse(request.query).familyId;
    return { events: await repository.listFamilyEvents(user.id, familyId) };
  });

  app.post("/api/events", async (request, reply) => {
    const user = await requireUser(request, reply, auth, supabase, repository, config);
    if (!user) return;
    const input = eventSchema.parse(request.body);
    if (!(await repository.findFamilyForUser(user.id, input.familyId))) return reply.code(404).send({ error: { code: "FAMILY_NOT_FOUND", message: "Family was not found" } });
    const event = { id: crypto.randomUUID(), vertexId: randomVertexId(), ...input, createdBy: user.id, createdAt: new Date().toISOString() };
    return reply.code(201).send({ event: await repository.createFamilyEvent(event) });
  });

  app.get("/api/files", async (request, reply) => {
    const user = await requireUser(request, reply, auth, supabase, repository, config);
    if (!user) return;
    const familyId = z.object({ familyId: z.uuid() }).parse(request.query).familyId;
    return { files: await repository.listFamilyFiles(user.id, familyId) };
  });

  app.post("/api/files", async (request, reply) => {
    const user = await requireUser(request, reply, auth, supabase, repository, config);
    if (!user) return;
    const input = fileSchema.parse(request.body);
    if (!(await repository.findFamilyForUser(user.id, input.familyId))) return reply.code(404).send({ error: { code: "FAMILY_NOT_FOUND", message: "Family was not found" } });
    const file = { id: crypto.randomUUID(), vertexId: randomVertexId(), ...input, uploadedBy: user.id, uploaderName: user.name, createdAt: new Date().toISOString() };
    return reply.code(201).send({ file: await repository.createFamilyFile(file) });
  });

  app.patch("/api/families/:familyId/members/:memberId/relationship", async (request, reply) => {
    const user = await requireUser(request, reply, auth, supabase, repository, config);
    if (!user) return;
    const { familyId, memberId } = z.object({ familyId: z.uuid(), memberId: z.uuid() }).parse(request.params);
    await repository.setMemberRelationship(user.id, familyId, memberId, relationshipSchema.parse(request.body).relationship);
    return reply.code(204).send();
  });

  app.post("/api/invitations", async (request, reply) => {
    const user = await requireUser(request, reply, auth, supabase, repository, config);
    if (!user) return;
    const input = invitationSchema.parse(request.body);
    const family = await repository.findFamilyForUser(user.id, input.familyId);
    if (!family || !["owner", "admin"].includes(family.role)) return reply.code(403).send({ error: { code: "FORBIDDEN", message: "Only family stewards can invite members" } });
    const invitation = {
      id: crypto.randomUUID(), vertexId: randomVertexId(), code: createInviteCode(), familyId: family.id, familyName: family.name,
      invitedBy: user.id, inviterName: user.name, invitedEmail: input.email.toLowerCase(), relationship: input.relationship,
      createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    };
    await repository.createInvitation(invitation);
    const delivery = input.email ? await email.sendFamilyInvitation(input.email, invitation) : { delivered: false };
    return reply.code(201).send({ invitation, delivery });
  });

  app.get("/api/invitations/:code", async (request, reply) => {
    const user = await requireUser(request, reply, auth, supabase, repository, config);
    if (!user) return;
    const invitation = await repository.findInvitationByCode(inviteCodeSchema.parse(request.params).code);
    if (!invitation || invitation.expiresAt <= new Date().toISOString()) return reply.code(404).send({ error: { code: "INVITATION_NOT_FOUND", message: "This invitation is invalid or expired" } });
    return { invitation };
  });

  app.post("/api/invitations/:code/accept", async (request, reply) => {
    const user = await requireUser(request, reply, auth, supabase, repository, config);
    if (!user) return;
    const invitation = await repository.findInvitationByCode(inviteCodeSchema.parse(request.params).code);
    if (!invitation || invitation.expiresAt <= new Date().toISOString()) return reply.code(404).send({ error: { code: "INVITATION_NOT_FOUND", message: "This invitation is invalid or expired" } });
    if (invitation.invitedEmail && invitation.invitedEmail !== user.email.toLowerCase()) return reply.code(403).send({ error: { code: "INVITATION_EMAIL_MISMATCH", message: "This invitation was sent to another email address" } });
    await repository.joinFamily(user.id, invitation.familyId, invitation.relationship);
    return { familyId: invitation.familyId };
  });

  app.get("/api/uploads/cloudinary-config", async (request, reply) => {
    const user = await requireUser(request, reply, auth, supabase, repository, config);
    if (!user) return;
    return cloudinary.getUnsignedUploadConfig();
  });

  app.post("/api/ai/chat", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (request, reply) => {
    const user = await requireUser(request, reply, auth, supabase, repository, config);
    if (!user) return;
    const input = chatSchema.parse(request.body);
    const family = await repository.findFamilyForUser(user.id, input.familyId);
    if (!family) return reply.code(404).send({ error: { code: "FAMILY_NOT_FOUND", message: "Family was not found" } });
    const context = await retrieval.retrieve(family.id, input.question);
    return ai.generate({ question: input.question, familyName: family.name, context });
  });

  return app;
}

async function requireUser(request: FastifyRequest, reply: FastifyReply, auth: AuthService, supabase: SupabaseAuthService, repository: KinshipRepository, config: AppConfig) {
  const user = await getAuthenticatedUser(request, auth, supabase, repository, config);
  if (!user) {
    await reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "Authentication is required" } });
    return null;
  }
  return user;
}

async function getAuthenticatedUser(request: FastifyRequest, auth: AuthService, supabase: SupabaseAuthService, repository: KinshipRepository, config: AppConfig) {
  const identity = await supabase.getIdentity(request.headers.authorization);
  if (identity) {
    const existing = await repository.findUserById(identity.id) ?? await repository.findUserByEmail(identity.email);
    if (existing) return toPublicUser(existing);
    const user = await repository.createUser({
      id: identity.id,
      vertexId: randomVertexId(),
      email: identity.email,
      name: identity.name,
      // Supabase owns password verification; this placeholder is never used for bearer-token sessions.
      passwordHash: "supabase-managed",
      createdAt: identity.createdAt,
    });
    return { ...toPublicUser(user), emailVerified: identity.emailVerified };
  }
  return auth.authenticate(request.cookies[config.SESSION_COOKIE_NAME]);
}

function toPublicUser(user: import("./domain.js").User) {
  return { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified, createdAt: user.createdAt, gender: user.gender || "", phone: user.phone || "", birthday: user.birthday || "", profileComplete: Boolean(user.profileComplete) };
}

function createInviteCode() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
}

function setSessionCookie(reply: FastifyReply, config: AppConfig, token: string, expiresAt: string) {
  reply.setCookie(config.SESSION_COOKIE_NAME, token, { ...sessionCookieOptions(config), expires: new Date(expiresAt) });
}

function sessionCookieOptions(config: AppConfig) {
  return { path: "/", httpOnly: true, secure: config.NODE_ENV === "production", sameSite: "strict" as const };
}

function authMessage(code: string) {
  if (code === "INVALID_CREDENTIALS") return "Incorrect email or password";
  if (code === "EXPIRED_TOKEN") return "This link has expired";
  return "This authentication token is invalid";
}
