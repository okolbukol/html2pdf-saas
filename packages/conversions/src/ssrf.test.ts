import { describe, expect, it } from "vitest";
import { validateRedirectUrl, validateSafePublicUrl, type DnsResolver } from "./ssrf";

const resolver = (addresses: string[]): DnsResolver => ({
  async lookup() {
    return addresses;
  }
});

describe("SSRF-safe URL validator", () => {
  it("accepts public URLs", async () => {
    await expect(
      validateSafePublicUrl("https://example.com/report", { resolver: resolver(["93.184.216.34"]) })
    ).resolves.toMatchObject({ normalizedUrl: "https://example.com/report" });
  });

  it("rejects localhost", async () => {
    await expect(validateSafePublicUrl("http://localhost:3000")).rejects.toMatchObject({
      code: "BLOCKED_HOSTNAME"
    });
  });

  it("rejects private IPv4", async () => {
    await expect(validateSafePublicUrl("http://192.168.1.10")).rejects.toMatchObject({
      code: "PRIVATE_NETWORK_URL"
    });
  });

  it("rejects private IPv6", async () => {
    await expect(validateSafePublicUrl("http://[fc00::1]")).rejects.toMatchObject({
      code: "UNSAFE_RESOLVED_IP"
    });
  });

  it("rejects IPv4-mapped IPv6 private addresses", async () => {
    await expect(validateSafePublicUrl("http://[::ffff:127.0.0.1]")).rejects.toMatchObject({
      code: "PRIVATE_NETWORK_URL"
    });
  });

  it("rejects cloud metadata IPs", async () => {
    await expect(validateSafePublicUrl("http://169.254.169.254/latest")).rejects.toMatchObject({
      code: "PRIVATE_NETWORK_URL"
    });
  });

  it("rejects unsupported protocols", async () => {
    await expect(validateSafePublicUrl("file:///etc/passwd")).rejects.toMatchObject({
      code: "UNSUPPORTED_PROTOCOL"
    });
  });

  it("rejects URLs with credentials", async () => {
    await expect(validateSafePublicUrl("https://user:pass@example.com")).rejects.toMatchObject({
      code: "URL_CREDENTIALS_NOT_ALLOWED"
    });
  });

  it("rejects hostnames that resolve to private IPs", async () => {
    await expect(
      validateSafePublicUrl("https://example.com", { resolver: resolver(["10.0.0.5"]) })
    ).rejects.toMatchObject({ code: "PRIVATE_NETWORK_URL" });
  });

  it("accepts public redirects when the redirect target remains public", async () => {
    await expect(
      validateRedirectUrl("https://cdn.example.com/file", {
        maxRedirects: 3,
        redirectCount: 0,
        resolver: resolver(["93.184.216.34"])
      })
    ).resolves.toMatchObject({ normalizedUrl: "https://cdn.example.com/file" });
  });

  it("rejects public redirects to localhost or private networks", async () => {
    await expect(
      validateRedirectUrl("http://localhost:3000", {
        maxRedirects: 3,
        redirectCount: 0
      })
    ).rejects.toMatchObject({ code: "BLOCKED_HOSTNAME" });

    await expect(
      validateRedirectUrl("https://cdn.example.com/private", {
        maxRedirects: 3,
        redirectCount: 0,
        resolver: resolver(["172.16.0.10"])
      })
    ).rejects.toMatchObject({ code: "PRIVATE_NETWORK_URL" });
  });

  it("fails safely when DNS resolution fails or changes to private", async () => {
    await expect(
      validateSafePublicUrl("https://example.com", {
        resolver: {
          async lookup() {
            throw new Error("dns down");
          }
        }
      })
    ).rejects.toMatchObject({ code: "DNS_RESOLUTION_FAILED" });

    let calls = 0;
    await expect(
      validateSafePublicUrl("https://example.com", {
        resolver: {
          async lookup() {
            calls += 1;
            return calls === 1 ? ["93.184.216.34"] : ["127.0.0.1"];
          }
        }
      })
    ).resolves.toBeTruthy();
    await expect(
      validateSafePublicUrl("https://example.com", {
        resolver: {
          async lookup() {
            return ["127.0.0.1"];
          }
        }
      })
    ).rejects.toMatchObject({ code: "PRIVATE_NETWORK_URL" });
  });

  it("enforces redirect limits", async () => {
    await expect(
      validateRedirectUrl("https://example.com", {
        maxRedirects: 1,
        redirectCount: 1,
        resolver: resolver(["93.184.216.34"])
      })
    ).rejects.toMatchObject({ code: "TOO_MANY_REDIRECTS" });
  });
});
