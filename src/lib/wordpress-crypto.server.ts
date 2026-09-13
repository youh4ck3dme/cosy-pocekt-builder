import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function cryptoKey(): Buffer {
  const secret = process.env.WORDPRESS_ENCRYPTION_KEY?.trim();
  if (!secret) throw new Error("WORDPRESS_ENCRYPTION_KEY nie je nakonfigurovaný.");
  return createHash("sha256").update(secret).digest();
}

export function encryptWordPressPassword(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", cryptoKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptWordPressPassword(value: string): string {
  const [iv, tag, ciphertext] = value.split(".");
  if (!iv || !tag || !ciphertext) throw new Error("Uložené prihlasovacie údaje sú neplatné.");
  const decipher = createDecipheriv("aes-256-gcm", cryptoKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
