import { prisma } from '@/lib/prisma';

export const INITIAL_SCORE = 100;
const SYSTEM_EMAIL = 'system@game-score.local';

export async function getOrCreateSystemUser() {
  let system = await prisma.user.findUnique({
    where: { email: SYSTEM_EMAIL },
  });
  if (!system) {
    system = await prisma.user.create({
      data: {
        email: SYSTEM_EMAIL,
        passwordHash: '',
        name: '系统',
        avatar: 'https://api.dicebear.com/9.x/identicon/svg?seed=system',
      },
    });
  }
  return system;
}
