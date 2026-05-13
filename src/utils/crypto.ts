import CryptoJS from 'crypto-js';
import crypto from 'crypto';

const SECRET_KEY = process.env.CHAT_SECRET_KEY;

if (!SECRET_KEY) {
  throw new Error('CHAT_SECRET_KEY is missing in .env file!');
}

// For buffer encryption, we need a 32-byte key
const getBufferKey = () => {
  return crypto.createHash('sha256').update(SECRET_KEY).digest();
};

/**
 * Encrypt a message (Usually done on Frontend in E2EE)
 */
export const encryptMessage = (message: string): string => {
  return CryptoJS.AES.encrypt(message, SECRET_KEY).toString();
};

/**
 * Decrypt a message (Usually done on Frontend in E2EE)
 */
export const decryptMessage = (ciphertext: string): string => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * Encrypt a buffer (for files)
 */
export const encryptBuffer = (buffer: Buffer): Buffer => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getBufferKey(), iv);
  const encrypted = Buffer.concat([iv, cipher.update(buffer), cipher.final()]);
  return encrypted;
};

/**
 * Decrypt a buffer (for files)
 */
export const decryptBuffer = (encryptedBuffer: Buffer): Buffer => {
  const iv = encryptedBuffer.slice(0, 16);
  const ciphertext = encryptedBuffer.slice(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', getBufferKey(), iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted;
};
