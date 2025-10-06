import crypto from "crypto";

const ALGO = "aes-256-gcm";
const ENC_KEY = process.env.USER_APIKEY_ENCRYPTION_KEY!; // 32 bytes base64

if (!ENC_KEY) {
  throw new Error("USER_APIKEY_ENCRYPTION_KEY environment variable is required");
}

export interface EncryptedData {
  iv: string;
  content: string;
  tag: string;
}

export function encryptApiKey(text: string): EncryptedData {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    ALGO,
    Buffer.from(ENC_KEY, "base64"),
    iv
  );
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    content: encrypted,
    tag: tag.toString("base64"),
  };
}

export function decryptApiKey(encrypted: EncryptedData): string {
  const decipher = crypto.createDecipheriv(
    ALGO,
    Buffer.from(ENC_KEY, "base64"),
    Buffer.from(encrypted.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(encrypted.tag, "base64"));
  let decrypted = decipher.update(encrypted.content, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
