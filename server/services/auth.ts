import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import type { AppConfig } from "../config.js";
import type { KinshipRepository, Session, User } from "../domain.js";
import { randomVertexId } from "../repositories/hydradb.js";

type EmailTokenPurpose = "verify-email" | "reset-password";

export class AuthService {
  constructor(private readonly repository: KinshipRepository, private readonly config: AppConfig) {}

  async register(input: { name: string; email: string; password: string }) {
    const email = input.email.trim().toLowerCase();
    const user = await this.repository.createUser({
      id: crypto.randomUUID(),
      vertexId: randomVertexId(),
      name: input.name.trim(),
      email,
      passwordHash: await this.hashPassword(input.password),
      createdAt: new Date().toISOString(),
    });
    return { user: publicUser(user), verificationToken: this.createEmailToken(user.id, "verify-email", 24 * 60 * 60) };
  }

  async login(emailInput: string, password: string) {
    const user = await this.repository.findUserByEmail(emailInput.trim().toLowerCase());
    if (!user || !(await verify(user.passwordHash, `${password}${this.config.PASSWORD_PEPPER}`))) {
      throw new AuthError("INVALID_CREDENTIALS", 401);
    }
    const { token, session } = this.createSession(user.id);
    await this.repository.createSession(session);
    return { user: publicUser(user), token, expiresAt: session.expiresAt };
  }

  async authenticate(token: string | undefined) {
    if (!token) return null;
    await this.repository.deleteExpiredSessions(new Date().toISOString());
    const session = await this.repository.findSession(hashToken(token));
    if (!session || session.expiresAt <= new Date().toISOString()) return null;
    const user = await this.repository.findUserById(session.userId);
    return user ? publicUser(user) : null;
  }

  async logout(token: string | undefined) {
    if (token) await this.repository.deleteSession(hashToken(token));
  }

  async verifyEmail(token: string) {
    const userId = this.verifyEmailToken(token, "verify-email");
    await this.repository.verifyUser(userId);
  }

  async createPasswordReset(emailInput: string) {
    const user = await this.repository.findUserByEmail(emailInput.trim().toLowerCase());
    return user ? this.createEmailToken(user.id, "reset-password", 60 * 60) : null;
  }

  async resetPassword(token: string, password: string) {
    const userId = this.verifyEmailToken(token, "reset-password");
    await this.repository.updateUserPassword(userId, await this.hashPassword(password));
  }

  createEmailToken(userId: string, purpose: EmailTokenPurpose, ttlSeconds: number) {
    const payload = Buffer.from(JSON.stringify({ userId, purpose, expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds })).toString("base64url");
    const signature = createHmac("sha256", this.config.PASSWORD_PEPPER).update(payload).digest("base64url");
    return `${payload}.${signature}`;
  }

  verifyEmailToken(token: string, purpose: EmailTokenPurpose) {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) throw new AuthError("INVALID_TOKEN", 400);
    const expected = createHmac("sha256", this.config.PASSWORD_PEPPER).update(payload).digest();
    const provided = Buffer.from(signature, "base64url");
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) throw new AuthError("INVALID_TOKEN", 400);
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as { userId: string; purpose: EmailTokenPurpose; expiresAt: number };
    if (parsed.purpose !== purpose || parsed.expiresAt < Math.floor(Date.now() / 1000)) throw new AuthError("EXPIRED_TOKEN", 400);
    return parsed.userId;
  }

  private createSession(userId: string) {
    const token = randomBytes(32).toString("base64url");
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + this.config.SESSION_TTL_DAYS * 86_400_000);
    const session: Session = {
      id: crypto.randomUUID(),
      vertexId: randomVertexId(),
      tokenHash: hashToken(token),
      userId,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    return { token, session };
  }

  private hashPassword(password: string) {
    return hash(`${password}${this.config.PASSWORD_PEPPER}`, { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 });
  }
}

export class AuthError extends Error {
  constructor(public readonly code: string, public readonly statusCode: number) { super(code); }
}

export function publicUser(user: User) {
  return { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified, createdAt: user.createdAt, gender: user.gender, phone: user.phone, birthday: user.birthday, profileComplete: user.profileComplete, avatarUrl: user.avatarUrl };
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
