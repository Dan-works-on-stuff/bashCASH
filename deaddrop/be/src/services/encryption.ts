import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';
import { config } from '../config.js';

const kms = new KMSClient({});

export async function kmsEncrypt(plaintext: string): Promise<string> {
  const { CiphertextBlob } = await kms.send(
    new EncryptCommand({
      KeyId: config.kmsKeyId,
      Plaintext: Buffer.from(plaintext, 'utf-8'),
    }),
  );
  if (!CiphertextBlob) throw new Error('KMS encrypt returned empty ciphertext');
  return Buffer.from(CiphertextBlob).toString('base64');
}

export async function kmsDecrypt(ciphertext: string): Promise<string> {
  const { Plaintext } = await kms.send(
    new DecryptCommand({
      CiphertextBlob: Buffer.from(ciphertext, 'base64'),
    }),
  );
  if (!Plaintext) throw new Error('KMS decrypt returned empty plaintext');
  return Buffer.from(Plaintext).toString('utf-8');
}
