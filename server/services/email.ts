import { Resend } from "resend";
import type { AppConfig } from "../config.js";

export class EmailService {
  private readonly resend: Resend | null;
  constructor(private readonly config: AppConfig) {
    this.resend = config.RESEND_API_KEY ? new Resend(config.RESEND_API_KEY) : null;
  }

  async sendVerification(email: string, token: string) {
    const url = `${this.config.APP_ORIGIN}/auth?verify=${encodeURIComponent(token)}`;
    if (!this.resend) {
      if (this.config.NODE_ENV === "production") throw new Error("RESEND_API_KEY is required in production");
      return { delivered: false, previewUrl: url };
    }
    const { error } = await this.resend.emails.send({
      from: this.config.RESEND_FROM_EMAIL,
      to: email,
      subject: "Verify your Kinship email",
      html: `<p>Welcome to Kinship.</p><p><a href="${url}">Verify your email address</a></p><p>This link expires in 24 hours.</p>`,
    });
    if (error) throw new Error(`Resend failed: ${error.message}`);
    return { delivered: true };
  }

  async sendPasswordReset(email: string, token: string) {
    const url = `${this.config.APP_ORIGIN}/auth?reset=${encodeURIComponent(token)}`;
    if (!this.resend) {
      if (this.config.NODE_ENV === "production") throw new Error("RESEND_API_KEY is required in production");
      return { delivered: false, previewUrl: url };
    }
    const { error } = await this.resend.emails.send({
      from: this.config.RESEND_FROM_EMAIL,
      to: email,
      subject: "Reset your Kinship password",
      html: `<p>A password reset was requested for your Kinship account.</p><p><a href="${url}">Reset your password</a></p><p>This link expires in one hour.</p>`,
    });
    if (error) throw new Error(`Resend failed: ${error.message}`);
    return { delivered: true };
  }

  async sendFamilyInvitation(email: string, input: { code: string; inviterName: string; familyName: string }) {
    const url = `${this.config.APP_ORIGIN}/invite?code=${encodeURIComponent(input.code)}`;
    if (!this.resend) return { delivered: false, previewUrl: url };
    const { error } = await this.resend.emails.send({
      from: this.config.RESEND_FROM_EMAIL,
      to: email,
      subject: `${input.inviterName} invited you to Kinship`,
      html: `<p>${input.inviterName} invited you to join ${input.familyName} on Kinship.</p><p><a href="${url}">View invitation</a></p><p>You can also enter this invite code: <strong>${input.code}</strong></p>`,
    });
    if (error) throw new Error(`Resend failed: ${error.message}`);
    return { delivered: true };
  }
}
