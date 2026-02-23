import "server-only";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment variables: ${formatted}`);
}

const env = parsed.data;

const insecureSecrets = [
  "your-super-secret-key-change-this-in-production",
  "your-secret-key-here",
  "changeme",
  "secret",
];

if (
  env.NODE_ENV === "production" &&
  insecureSecrets.some((value) => env.NEXTAUTH_SECRET.toLowerCase().includes(value))
) {
  throw new Error("NEXTAUTH_SECRET is insecure for production");
}

export { env };
