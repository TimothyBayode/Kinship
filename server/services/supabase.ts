import { createClient } from "@supabase/supabase-js";
import type { AppConfig } from "../config.js";

export type SupabaseIdentity = { id: string; email: string; name: string; emailVerified: boolean; createdAt: string };

export class SupabaseAuthService {
  private readonly client;

  constructor(config: AppConfig) {
    this.client = config.SUPABASE_URL && config.SUPABASE_ANON_KEY
      ? createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, { auth: { persistSession: false } })
      : null;
  }

  get enabled() {
    return this.client !== null;
  }

  async getIdentity(authorization: string | undefined): Promise<SupabaseIdentity | null> {
    if (!this.client || !authorization?.startsWith("Bearer ")) return null;
    const { data, error } = await this.client.auth.getUser(authorization.slice(7));
    if (error || !data.user.email) return null;
    return {
      id: data.user.id,
      email: data.user.email,
      name: typeof data.user.user_metadata.full_name === "string" ? data.user.user_metadata.full_name : data.user.email.split("@")[0],
      emailVerified: Boolean(data.user.email_confirmed_at),
      createdAt: data.user.created_at,
    };
  }
}
