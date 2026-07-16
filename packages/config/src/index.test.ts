import { describe, expect, it } from "vitest";
import { safeParseEnv } from "./index";

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
