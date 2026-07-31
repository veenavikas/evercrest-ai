import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, combined: string): Promise<boolean> {
  try {
    const [salt, key] = combined.split(":");
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    return timingSafeEqual(keyBuffer, derivedKey);
  } catch (err) {
    return false;
  }
}
