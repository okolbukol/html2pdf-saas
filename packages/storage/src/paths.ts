import path from "node:path";

export function assertSafeStorageKey(key: string): void {
  if (!/^[a-f0-9-]{36}\.(html|pdf)$/.test(key)) {
    throw new Error("Invalid storage key");
  }
}

export function resolveStoragePath(root: string, key: string): string {
  assertSafeStorageKey(key);
  return resolvePathInsideRoot(root, key);
}

export function resolveStorageTempPath(root: string, key: string): string {
  assertSafeStorageKey(key);
  return resolvePathInsideRoot(root, `${key}.tmp`);
}

export function resolveStorageMetadataPath(root: string, key: string): string {
  assertSafeStorageKey(key);
  return resolvePathInsideRoot(root, `${key}.meta.json`);
}

function resolvePathInsideRoot(root: string, name: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, name);

  if (!resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("Storage key escapes storage root");
  }

  return resolvedPath;
}
