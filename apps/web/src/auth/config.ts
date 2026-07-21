import type { Adapter } from "next-auth/adapters";
import { strongProductionSecretSchema } from "@html2pdf-pro/config";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { createAuthAdapter } from "./adapter";

export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const PRODUCTION_SESSION_COOKIE_NAME = "__Host-html2pdf_session";
export const LOCAL_SESSION_COOKIE_NAME = "html2pdf_dev_session";

const authEnvironmentSchema = z
  .object({
    APP_SECRET: z.string().min(32),
    AUTH_GOOGLE_ID: z.string().min(1),
    AUTH_GOOGLE_SECRET: z.string().min(1),
    AUTH_URL: z.string().url(),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development")
  })
  .superRefine((environment, context) => {
    const authUrl = new URL(environment.AUTH_URL);

    if (
      authUrl.username ||
      authUrl.password ||
      authUrl.pathname !== "/" ||
      authUrl.search ||
      authUrl.hash
    ) {
      context.addIssue({
        code: "custom",
        message: "AUTH_URL must be an origin without credentials, path, query, or fragment.",
        path: ["AUTH_URL"]
      });
    }

    const localHttp =
      authUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(authUrl.hostname);

    if (environment.NODE_ENV === "production" && authUrl.protocol !== "https:" && !localHttp) {
      context.addIssue({
        code: "custom",
        message: "AUTH_URL must use HTTPS in production.",
        path: ["AUTH_URL"]
      });
    }

    if (
      environment.NODE_ENV === "development" &&
      authUrl.protocol === "http:" &&
      !["localhost", "127.0.0.1"].includes(authUrl.hostname)
    ) {
      context.addIssue({
        code: "custom",
        message: "Development HTTP authentication is limited to an exact localhost origin.",
        path: ["AUTH_URL"]
      });
    }

    if (
      environment.NEXT_PUBLIC_APP_URL &&
      new URL(environment.NEXT_PUBLIC_APP_URL).origin !== authUrl.origin
    ) {
      context.addIssue({
        code: "custom",
        message: "AUTH_URL and NEXT_PUBLIC_APP_URL must identify the same origin.",
        path: ["AUTH_URL"]
      });
    }

    if (
      environment.NODE_ENV === "production" &&
      !strongProductionSecretSchema.safeParse(environment.APP_SECRET).success
    ) {
      context.addIssue({
        code: "custom",
        message: "APP_SECRET must be a strong non-default secret in production.",
        path: ["APP_SECRET"]
      });
    }
  });

export type AuthEnvironment = z.infer<typeof authEnvironmentSchema>;

export function parseAuthEnvironment(environment: NodeJS.ProcessEnv): AuthEnvironment {
  return authEnvironmentSchema.parse(environment);
}

function safeRedirect(url: string, applicationOrigin: string): string {
  try {
    const target = new URL(url, applicationOrigin);
    return target.origin === applicationOrigin ? target.toString() : applicationOrigin;
  } catch {
    return applicationOrigin;
  }
}

export function createAuthConfig(
  environment: NodeJS.ProcessEnv = process.env,
  adapter: Adapter = createAuthAdapter()
): NextAuthConfig {
  const authEnvironment = parseAuthEnvironment(environment);
  const applicationOrigin = new URL(authEnvironment.AUTH_URL).origin;
  const secureCookie = applicationOrigin.startsWith("https://");
  const sessionCookieName = secureCookie
    ? PRODUCTION_SESSION_COOKIE_NAME
    : LOCAL_SESSION_COOKIE_NAME;

  return {
    adapter,
    callbacks: {
      async redirect({ url }) {
        return safeRedirect(url, applicationOrigin);
      },
      async session({ session, user }) {
        session.user.id = user.id;
        return session;
      },
      async signIn({ account, profile }) {
        return (
          account?.provider === "google" &&
          typeof profile?.sub === "string" &&
          profile.sub.length > 0 &&
          profile.email_verified === true
        );
      }
    },
    cookies: {
      sessionToken: {
        name: sessionCookieName,
        options: {
          httpOnly: true,
          path: "/",
          sameSite: "lax",
          secure: secureCookie
        }
      }
    },
    pages: {
      signIn: "/"
    },
    providers: [
      Google({
        clientId: authEnvironment.AUTH_GOOGLE_ID,
        clientSecret: authEnvironment.AUTH_GOOGLE_SECRET
      })
    ],
    secret: authEnvironment.APP_SECRET,
    session: {
      maxAge: SESSION_MAX_AGE_SECONDS,
      strategy: "database",
      updateAge: SESSION_MAX_AGE_SECONDS
    },
    trustHost: true,
    useSecureCookies: secureCookie
  };
}
