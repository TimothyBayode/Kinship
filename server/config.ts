import "dotenv/config";
import { z } from "zod";

const optionalString = z.string().trim().optional().default("");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().default("127.0.0.1"),
  API_PORT: z.coerce.number().int().positive().default(3001),
  APP_ORIGIN: z.string().url().default("http://127.0.0.1:5173"),
  SESSION_COOKIE_NAME: z.string().min(1).default("kinship_session"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  PASSWORD_PEPPER: z.string().min(32).default("development-only-pepper-change-me-now"),
  SUPABASE_URL: optionalString,
  SUPABASE_ANON_KEY: optionalString,
  DATA_PROVIDER: z.enum(["memory", "hydradb"]).default("memory"),
  HYDRADB_HTTP_URL: z.string().url().default("http://127.0.0.1:8443"),
  HYDRADB_AUTH_TOKEN: optionalString,
  HYDRADB_NAMESPACE: z.string().default("kinship"),
  HYDRADB_GRAPH_ID: z.string().default("kinship"),
  HYDRADB_CELL_ID: z.string().default("cell-0"),
  HYDRADB_CONSISTENCY: z.enum(["causal", "strong"]).default("causal"),
  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_UPLOAD_PRESET: optionalString,
  GEMINI_API_KEY: optionalString,
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  RESEND_API_KEY: optionalString,
  RESEND_FROM_EMAIL: z.string().default("Kinship <noreply@example.com>"),
});

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const config = schema.parse(env);
  if (config.DATA_PROVIDER === "hydradb" && config.HYDRADB_AUTH_TOKEN.length < 32) {
    throw new Error("HYDRADB_AUTH_TOKEN must contain at least 32 characters when DATA_PROVIDER=hydradb");
  }
  if (config.NODE_ENV === "production" && config.PASSWORD_PEPPER.startsWith("development-")) {
    throw new Error("PASSWORD_PEPPER must be replaced in production");
  }
  if (Boolean(config.SUPABASE_URL) !== Boolean(config.SUPABASE_ANON_KEY)) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be configured together");
  }
  return config;
}
