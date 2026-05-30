import crypto from "crypto";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) throw new Error("ENCRYPTION_KEY 환경변수 없음");
  if (hex.length !== 64) throw new Error("ENCRYPTION_KEY는 64자 hex (32bytes) 필요");
  return Buffer.from(hex, "hex");
}

// AES-256-GCM 암호화. 저장 형식: iv(24hex) + authTag(32hex) + ciphertext(hex)
export function encrypt(plain: string): string {
  if (!plain) return "";
  const key    = getKey();
  const iv     = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc    = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return iv.toString("hex") + cipher.getAuthTag().toString("hex") + enc.toString("hex");
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext || ciphertext.length < 56) return ciphertext;
  const key     = getKey();
  const iv      = Buffer.from(ciphertext.slice(0, 24), "hex");
  const tag     = Buffer.from(ciphertext.slice(24, 56), "hex");
  const enc     = Buffer.from(ciphertext.slice(56), "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc).toString("utf8") + decipher.final("utf8");
}

// 정확한 이름 검색용 결정론적 HMAC-SHA256 해시
export function hashForSearch(value: string): string {
  if (!value) return "";
  return crypto.createHmac("sha256", getKey()).update(value).digest("hex");
}

// 암호화 여부 판별 (iv+tag+enc 최소 길이: 56자)
export function isEncrypted(value: string): boolean {
  return typeof value === "string" && value.length >= 56 && /^[0-9a-f]+$/i.test(value.slice(0, 56));
}
