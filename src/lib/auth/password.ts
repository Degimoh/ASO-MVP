import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SALT_BYTES = 16;
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, expectedHash] = storedHash.split(":");

  if (!salt || !expectedHash) {
    return false;
  }

  const computedHash = scryptSync(password, salt, KEY_LENGTH).toString("hex");

  try {
    return timingSafeEqual(Buffer.from(expectedHash, "hex"), Buffer.from(computedHash, "hex"));
  } catch {
    return false;
  }
}
