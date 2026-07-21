import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { REPOSITORY_SECRET_PLACEHOLDER, safeParseEnv, strongProductionSecretSchema } from "./index";

describe("strong production secret validation", () => {
  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["short", "short"],
    ["repeated characters", "a".repeat(32)],
    ["changeme default", "changeme-please-before-production-123"],
    ["change_me default", "change_me_before_production_123456"],
    ["change me default", "change me before production 123456"],
    ["replace-with default", "replace-with-a-real-production-secret"],
    ["replace_with default", "replace_with_a_real_production_secret"],
    ["replace with default", "replace with a real production secret"],
    ["tracked repository placeholder", REPOSITORY_SECRET_PLACEHOLDER],
    ["documented example default", "example-secret-for-production-123456"]
  ])("rejects %s", (_description, secret) => {
    expect(strongProductionSecretSchema.safeParse(secret).success).toBe(false);
  });

  it("accepts a strong generated secret", () => {
    const secret = randomBytes(32).toString("base64url");

    expect(strongProductionSecretSchema.safeParse(secret).success).toBe(true);
  });
});

describe("environment validation", () => {
  it("accepts the required baseline variables", () => {
    const result = safeParseEnv({
      APP_SECRET: "a".repeat(32),
      DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
      INTERNAL_API_SECRET: "b".repeat(32),
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NODE_ENV: "test",
      REDIS_URL: "redis://localhost:6379",
      STORAGE_DRIVER: "local"
    });

    expect(result.success).toBe(true);
  });

  it("rejects short application secrets", () => {
    const result = safeParseEnv({
      APP_SECRET: "short",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
      INTERNAL_API_SECRET: "b".repeat(32),
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NODE_ENV: "test",
      REDIS_URL: "redis://localhost:6379",
      STORAGE_DRIVER: "local"
    });

    expect(result.success).toBe(false);
  });

  it("rejects default internal secrets in production", () => {
    const result = safeParseEnv({
      APP_SECRET: "replace-with-at-least-32-characters",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
      INTERNAL_API_SECRET: "replace-with-at-least-32-characters",
      NEXT_PUBLIC_APP_URL: "https://app.example.com",
      NODE_ENV: "production",
      REDIS_URL: "redis://localhost:6379",
      STORAGE_DRIVER: "local"
    });

    expect(result.success).toBe(false);
  });
});
