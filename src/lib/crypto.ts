import crypto from "node:crypto";

export type EncryptedBlob = {
  keyId: string;
  iv: Buffer; // 12 bytes
  authTag: Buffer; // 16 bytes
  ciphertext: Buffer;
};

function loadKeyFromEnv(envName: string): Buffer {
  const raw = process.env[envName];
  if (!raw) {
    throw new Error(`${envName} is not set. Please set a 32-byte base64 key in your env.`);
  }
  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    throw new Error(`${envName} must be base64-encoded.`);
  }
  if (key.length !== 32) {
    throw new Error(`${envName} must decode to exactly 32 bytes (256-bit).`);
  }
  return key;
}

const keyring: Record<string, Buffer> = {};

function getKey(keyId = "v1"): Buffer {
  if (keyring[keyId]) return keyring[keyId];
  if (keyId === "v1") {
    const key = loadKeyFromEnv("ENCRYPTION_KEY_V1");
    keyring[keyId] = key;
    return key;
  }
  throw new Error(`Unknown keyId ${keyId}`);
}

export function encryptJSON(data: unknown, keyId = "v1"): EncryptedBlob {
  const key = getKey(keyId);
  const iv = crypto.randomBytes(12); // GCM recommended 12-byte IV
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(data), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { keyId, iv, authTag, ciphertext };
}

export function decryptJSON(blob: EncryptedBlob): unknown {
  const key = getKey(blob.keyId);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, blob.iv);
  decipher.setAuthTag(blob.authTag);
  const decrypted = Buffer.concat([decipher.update(blob.ciphertext), decipher.final()]);
  const text = decrypted.toString("utf8");
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Decryption succeeded but JSON parse failed: ${(e as Error).message}`);
  }
}

export type SerializableEncryptedBlob = {
  keyId: string;
  ivB64: string;
  authTagB64: string;
  ciphertextB64: string;
};

export function toSerializable(blob: EncryptedBlob): SerializableEncryptedBlob {
  return {
    keyId: blob.keyId,
    ivB64: blob.iv.toString("base64"),
    authTagB64: blob.authTag.toString("base64"),
    ciphertextB64: blob.ciphertext.toString("base64"),
  };
}

export function fromSerializable(s: SerializableEncryptedBlob): EncryptedBlob {
  return {
    keyId: s.keyId,
    iv: Buffer.from(s.ivB64, "base64"),
    authTag: Buffer.from(s.authTagB64, "base64"),
    ciphertext: Buffer.from(s.ciphertextB64, "base64"),
  };
}
