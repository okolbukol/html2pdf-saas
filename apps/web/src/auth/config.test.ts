import type { Adapter } from "next-auth/adapters";
import { randomBytes } from "node:crypto";
import { REPOSITORY_SECRET_PLACEHOLDER } from "@html2pdf-pro/config";
import { describe, expect, it } from "vitest";
import {
  createAuthConfig,
  LOCAL_SESSION_COOKIE_NAME,
  parseAuthEnvironment,
  PRODUCTION_SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS
} from "./config";

const baseEnvironment = {
  APP_SECRET: "a".repeat(32),
  AUTH_GOOGLE_ID: "google-client-id",
  AUTH_GOOGLE_SECRET: "google-client-secret",
  AUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NODE_ENV: "test"
} satisfies NodeJS.ProcessEnv;

describe("authentication configuration", () => {
  it("uses fixed database sessions and the approved local cookie policy", () => {
    const config = createAuthConfig(baseEnvironment, {} as Adapter);

    expect(config.session).toEqual({
      maxAge: SESSION_MAX_AGE_SECONDS,
      strategy: "database",
      updateAge: SESSION_MAX_AGE_SECONDS
    });
    expect(config.cookies?.sessionToken).toEqual({
      name: LOCAL_SESSION_COOKIE_NAME,
      options: {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: false
      }
    });
  });

  it("enforces the production cookie and HTTPS requirements", () => {
    const environment = {
      ...baseEnvironment,
      APP_SECRET: randomBytes(32).toString("base64url"),
      AUTH_URL: "https://app.example.com",
      NEXT_PUBLIC_APP_URL: "https://app.example.com",
      NODE_ENV: "production" as const
    };
    const config = createAuthConfig(environment, {} as Adapter);

    expect(config.cookies?.sessionToken).toEqual({
      name: PRODUCTION_SESSION_COOKIE_NAME,
      options: {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: true
      }
    });
    expect(() =>
      parseAuthEnvironment({
        ...environment,
        AUTH_URL: "http://app.example.com",
        NEXT_PUBLIC_APP_URL: "http://app.example.com"
      })
    ).toThrow("AUTH_URL must use HTTPS in production");
  });

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
    ["documented example default", "default-secret-for-production-123456"]
  ])("rejects a %s APP_SECRET in production", (_description, secret) => {
    expect(() =>
      parseAuthEnvironment({
        ...baseEnvironment,
        APP_SECRET: secret,
        AUTH_URL: "https://app.example.com",
        NEXT_PUBLIC_APP_URL: "https://app.example.com",
        NODE_ENV: "production"
      })
    ).toThrow();
  });

  it("accepts a strong generated APP_SECRET in production", () => {
    expect(() =>
      parseAuthEnvironment({
        ...baseEnvironment,
        APP_SECRET: randomBytes(32).toString("base64url"),
        AUTH_URL: "https://app.example.com",
        NEXT_PUBLIC_APP_URL: "https://app.example.com",
        NODE_ENV: "production"
      })
    ).not.toThrow();
  });

  it("rejects unverified or incomplete Google identities", async () => {
    const signIn = createAuthConfig(baseEnvironment, {} as Adapter).callbacks?.signIn;
    expect(signIn).toBeDefined();

    await expect(
      signIn?.({
        account: { provider: "google" },
        profile: { email_verified: false, sub: "google-subject" }
      } as never)
    ).resolves.toBe(false);
    await expect(
      signIn?.({
        account: { provider: "google" },
        profile: { email_verified: true }
      } as never)
    ).resolves.toBe(false);
    await expect(
      signIn?.({
        account: { provider: "google" },
        profile: { email_verified: true, sub: "google-subject" }
      } as never)
    ).resolves.toBe(true);
  });

  it("exposes only the stable internal user id in the authenticated session", async () => {
    const sessionCallback = createAuthConfig(baseEnvironment, {} as Adapter).callbacks?.session;
    expect(sessionCallback).toBeDefined();

    const session = await sessionCallback?.({
      session: {
        expires: "2026-08-19T00:00:00.000Z",
        user: { email: "user@example.com", name: "Example User" }
      },
      user: {
        email: "user@example.com",
        emailVerified: new Date("2026-07-20T00:00:00.000Z"),
        id: "internal-user-id",
        image: null,
        name: "Example User"
      }
    } as never);

    expect(session?.user?.id).toBe("internal-user-id");
  });

  it("allows only parsed same-origin redirects", async () => {
    const redirect = createAuthConfig(baseEnvironment, {} as Adapter).callbacks?.redirect;
    expect(redirect).toBeDefined();

    for (const candidate of ["//attacker.example", "/\\attacker.example", "http://["]) {
      await expect(redirect?.({ url: candidate } as never)).resolves.toBe("http://localhost:3000");
    }

    for (const candidate of [
      "/dashboard",
      "/dashboard?view=recent",
      "http://localhost:3000/dashboard"
    ]) {
      await expect(redirect?.({ url: candidate } as never)).resolves.toBe(
        new URL(candidate, "http://localhost:3000").toString()
      );
    }

    await expect(redirect?.({ url: "https://attacker.example/redirect" } as never)).resolves.toBe(
      "http://localhost:3000"
    );
  });
});
