import dns from "node:dns/promises";
import net from "node:net";

export type SsrfErrorCode =
  | "INVALID_URL"
  | "UNSUPPORTED_PROTOCOL"
  | "URL_CREDENTIALS_NOT_ALLOWED"
  | "PRIVATE_NETWORK_URL"
  | "BLOCKED_HOSTNAME"
  | "DNS_RESOLUTION_FAILED"
  | "UNSAFE_RESOLVED_IP"
  | "TOO_MANY_REDIRECTS";

export class SsrfValidationError extends Error {
  constructor(
    readonly code: SsrfErrorCode,
    message: string
  ) {
    super(message);
    this.name = "SsrfValidationError";
  }
}

export interface DnsResolver {
  lookup(hostname: string): Promise<string[]>;
}

export interface SafeUrlValidationOptions {
  maxRedirects?: number;
  redirectCount?: number;
  resolver?: DnsResolver;
}

export interface SafeUrlValidationResult {
  normalizedUrl: string;
  resolvedAddresses: string[];
}

const defaultResolver: DnsResolver = {
  async lookup(hostname: string) {
    const records = await dns.lookup(hostname, { all: true, verbatim: true });
    return records.map((record) => record.address);
  }
};

const blockedHostnames = new Set([
  "localhost",
  "postgres",
  "redis",
  "web",
  "worker",
  "host.docker.internal",
  "docker.for.win.localhost",
  "docker.for.mac.localhost"
]);

const cloudMetadataIps = new Set(["169.254.169.254", "100.100.100.200"]);

const unsafeIpv4Cidrs = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4]
] as const;

const unsafeIpv6Cidrs = [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001::", 32],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8]
] as const;

export async function validateSafePublicUrl(
  rawUrl: string,
  options: SafeUrlValidationOptions = {}
): Promise<SafeUrlValidationResult> {
  const maxRedirects = options.maxRedirects ?? 5;
  const redirectCount = options.redirectCount ?? 0;

  if (redirectCount > maxRedirects) {
    throw new SsrfValidationError("TOO_MANY_REDIRECTS", "Redirect limit exceeded");
  }

  const url = parseUrl(rawUrl);
  validateProtocol(url);
  validateNoCredentials(url);

  const hostname = normalizeHostname(url.hostname);
  validateHostname(hostname);

  const directIp = unwrapIpv4MappedIpv6(hostname);
  const resolvedAddresses =
    net.isIP(directIp) === 0
      ? await resolveHostname(hostname, options.resolver ?? defaultResolver)
      : [directIp];

  for (const address of resolvedAddresses) {
    assertSafeResolvedIp(address);
  }

  url.hostname = hostname;
  return {
    normalizedUrl: url.toString(),
    resolvedAddresses
  };
}

export async function validateRedirectUrl(
  rawUrl: string,
  options: SafeUrlValidationOptions = {}
): Promise<SafeUrlValidationResult> {
  return validateSafePublicUrl(rawUrl, {
    ...options,
    redirectCount: (options.redirectCount ?? 0) + 1
  });
}

export function assertSafeResolvedIp(address: string): void {
  const normalized = unwrapIpv4MappedIpv6(address);
  const ipVersion = net.isIP(normalized);

  if (ipVersion === 0) {
    throw new SsrfValidationError("UNSAFE_RESOLVED_IP", "Resolved address is not a valid IP");
  }

  if (ipVersion === 4 && cloudMetadataIps.has(normalized)) {
    throw new SsrfValidationError("PRIVATE_NETWORK_URL", "Cloud metadata IP addresses are blocked");
  }

  if (ipVersion === 6) {
    const mappedIpv4 = extractIpv4MappedIpv6(normalized);
    if (mappedIpv4) {
      assertSafeResolvedIp(mappedIpv4);
      return;
    }
  }

  const unsafe =
    ipVersion === 4
      ? unsafeIpv4Cidrs.some(([network, prefix]) => ipv4InCidr(normalized, network, prefix))
      : unsafeIpv6Cidrs.some(([network, prefix]) => ipv6InCidr(normalized, network, prefix));

  if (unsafe) {
    throw new SsrfValidationError(
      ipVersion === 4 ? "PRIVATE_NETWORK_URL" : "UNSAFE_RESOLVED_IP",
      "Private, local, multicast or reserved IP addresses are blocked"
    );
  }
}

function parseUrl(rawUrl: string): URL {
  try {
    return new URL(rawUrl);
  } catch {
    throw new SsrfValidationError("INVALID_URL", "URL is invalid");
  }
}

function validateProtocol(url: URL): void {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfValidationError("UNSUPPORTED_PROTOCOL", "Only http and https URLs are allowed");
  }
}

function validateNoCredentials(url: URL): void {
  if (url.username || url.password) {
    throw new SsrfValidationError(
      "URL_CREDENTIALS_NOT_ALLOWED",
      "URLs with embedded credentials are not allowed"
    );
  }
}

function normalizeHostname(hostname: string): string {
  return hostname
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "")
    .toLowerCase();
}

function validateHostname(hostname: string): void {
  if (!hostname) {
    throw new SsrfValidationError("INVALID_URL", "URL hostname is required");
  }

  if (blockedHostnames.has(hostname) || hostname.endsWith(".localhost")) {
    throw new SsrfValidationError("BLOCKED_HOSTNAME", "Blocked internal hostname");
  }

  if (net.isIP(unwrapIpv4MappedIpv6(hostname)) === 0 && !hostname.includes(".")) {
    throw new SsrfValidationError("BLOCKED_HOSTNAME", "Single-label hostnames are blocked");
  }
}

async function resolveHostname(hostname: string, resolver: DnsResolver): Promise<string[]> {
  try {
    const addresses = await resolver.lookup(hostname);
    if (addresses.length === 0) {
      throw new Error("empty DNS response");
    }
    return addresses;
  } catch {
    throw new SsrfValidationError("DNS_RESOLUTION_FAILED", "DNS resolution failed");
  }
}

function unwrapIpv4MappedIpv6(address: string): string {
  const lower = address.toLowerCase();
  const match = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  return match ? (match[1] ?? address) : address;
}

function extractIpv4MappedIpv6(address: string): string | null {
  const value = ipv6ToBigInt(address);
  const mappedPrefix = ipv6ToBigInt("::ffff:0:0") >> 32n;

  if (value >> 32n !== mappedPrefix) {
    return null;
  }

  const ipv4 = Number(value & 0xffffffffn);
  return [(ipv4 >>> 24) & 0xff, (ipv4 >>> 16) & 0xff, (ipv4 >>> 8) & 0xff, ipv4 & 0xff].join(".");
}

function ipv4InCidr(address: string, network: string, prefix: number): boolean {
  const addressInt = ipv4ToInt(address);
  const networkInt = ipv4ToInt(network);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (addressInt & mask) === (networkInt & mask);
}

function ipv4ToInt(address: string): number {
  const parts = address.split(".").map((part) => Number(part));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    throw new SsrfValidationError("UNSAFE_RESOLVED_IP", "Invalid IPv4 address");
  }
  return (
    (((parts[0] ?? 0) << 24) |
      ((parts[1] ?? 0) << 16) |
      ((parts[2] ?? 0) << 8) |
      (parts[3] ?? 0)) >>>
    0
  );
}

function ipv6InCidr(address: string, network: string, prefix: number): boolean {
  const addressInt = ipv6ToBigInt(address);
  const networkInt = ipv6ToBigInt(network);
  const mask = prefix === 0 ? 0n : ((1n << BigInt(prefix)) - 1n) << BigInt(128 - prefix);
  return (addressInt & mask) === (networkInt & mask);
}

function ipv6ToBigInt(address: string): bigint {
  const normalized = expandIpv6(address);
  return normalized.reduce((acc, part) => (acc << 16n) + BigInt(part), 0n);
}

function expandIpv6(address: string): number[] {
  if (address.includes(".")) {
    const lastColon = address.lastIndexOf(":");
    const ipv4 = address.slice(lastColon + 1);
    const ipv4Int = ipv4ToInt(ipv4);
    const high = ((ipv4Int >>> 16) & 0xffff).toString(16);
    const low = (ipv4Int & 0xffff).toString(16);
    address = `${address.slice(0, lastColon)}:${high}:${low}`;
  }

  const [head = "", tail = ""] = address.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail ? tail.split(":") : [];
  const missing = 8 - headParts.length - tailParts.length;

  if (missing < 0 || (address.match(/::/g) ?? []).length > 1) {
    throw new SsrfValidationError("UNSAFE_RESOLVED_IP", "Invalid IPv6 address");
  }

  const parts = [...headParts, ...Array.from({ length: missing }, () => "0"), ...tailParts].map(
    (part) => {
      const value = Number.parseInt(part || "0", 16);
      if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
        throw new SsrfValidationError("UNSAFE_RESOLVED_IP", "Invalid IPv6 address");
      }
      return value;
    }
  );

  if (parts.length !== 8) {
    throw new SsrfValidationError("UNSAFE_RESOLVED_IP", "Invalid IPv6 address");
  }

  return parts;
}
