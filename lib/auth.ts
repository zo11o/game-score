// 服务端密码哈希（使用 Node crypto）
import { createHash } from 'crypto';

export async function hashPassword(password: string): Promise<string> {
  return createHash('sha256').update(password).digest('hex');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}
