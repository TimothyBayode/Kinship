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

const credentialsSchema = z.object({ email: z.email(), password: z.string().min(8).max(128) });
const registerSchema = credentialsSchema.extend({ name: z.string().trim().min(2).max(80) });
const tokenSchema = z.object({ token: z.string().min(20) });
const familySchema = z.object({ name: z.string().trim().min(2).max(100) });
const chatSchema = z.object({ familyId: z.uuid(), question: z.string().trim().min(1).max(8_000) });

export async function buildApp(config: AppConfig, repository: KinshipRepository) {
  const app = Fastify({ logger: config.NODE_ENV !== "test", trustProxy: config.NODE_ENV === "production" });
  const auth = new AuthService(repository, config);
  const email = new EmailService(config);
  const cloudinary = new CloudinaryService(config);
  const ai = new AiService(config);
  const retrieval = new RetrievalService(repository);

  await app.register(cookie);
  await app.register(cors, { origin: config.APP_ORIGIN, credentials: true, methods: ["GET", "POST", "DELETE", "OPTIONS"] });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

  app.addHook("onRequest", async (request, reply) => {
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
    const origin = request.headers.origin;
    if (origin && origin !== config.APP_ORIGIN) return reply.code(403).send({ error: { code: "ORIGIN_NOT_ALLOWED", message: "Request origin is not allowed" } });
  });

  app.setErrorHandler((error, _request, reply) => {
    const message = error instanceof Error ? error.message : "";
    if (error instanceof ZodError) return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Request data is invalid", details: error.issues } });
    if (error instanceof AuthError) return reply.code(error.statusCode).send({ error: { code: error.code, message: authMessage(error.code) } });
    if (message === "EMAIL_EXISTS") return reply.code(409).send({ error: { code: "EMAIL_EXISTS", message: "An account with this email already exists" } });
    if ((error as { code?: string }).code === "FST_ERR_CTP_INVALID_MEDIA_TYPE") return reply.code(415).send({ error: { code: "INVALID_CONTENT_TYPE", message: "Use application/json" } });
    app.log.error(error);
    return reply.code(500).send({ error: { code: "INTERNAL_ERROR", message: "The request could not be completed" } });
  });

  app.get("/api/health", async () => {
    await repository.health();
    return { status: "ok", dataProvider: config.DATA_PROVIDER };
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
    const user = await auth.authenticate(request.cookies[config.SESSION_COOKIE_NAME]);
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
    const user = await requireUser(request, reply, auth, config);
    if (!user) return;
    return { families: await repository.listFamiliesForUser(user.id) };
  });

  app.post("/api/families", async (request, reply) => {
    const user = await requireUser(request, reply, auth, config);
    if (!user) return;
    const input = familySchema.parse(request.body);
    const family = { id: crypto.randomUUID(), vertexId: randomVertexId(), name: input.name, createdBy: user.id, createdAt: new Date().toISOString() };
    await repository.createFamily(family, { userId: user.id, familyId: family.id, role: "owner" });
    return reply.code(201).send({ family });
  });

  app.get("/api/uploads/cloudinary-config", async (request, reply) => {
    const user = await requireUser(request, reply, auth, config);
    if (!user) return;
    return cloudinary.getUnsignedUploadConfig();
  });

  app.post("/api/ai/chat", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (request, reply) => {
    const user = await requireUser(request, reply, auth, config);
    if (!user) return;
    const input = chatSchema.parse(request.body);
    const family = await repository.findFamilyForUser(user.id, input.familyId);
    if (!family) return reply.code(404).send({ error: { code: "FAMILY_NOT_FOUND", message: "Family was not found" } });
    const context = await retrieval.retrieve(family.id, input.question);
    return ai.generate({ question: input.question, familyName: family.name, context });
  });

  return app;
}

async function requireUser(request: FastifyRequest, reply: FastifyReply, auth: AuthService, config: AppConfig) {
  const user = await auth.authenticate(request.cookies[config.SESSION_COOKIE_NAME]);
  if (!user) {
    await reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "Authentication is required" } });
    return null;
  }
  return user;
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
