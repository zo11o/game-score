import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateSystemUser, INITIAL_SCORE } from '@/lib/system-user';
import { broadcastRoomUpdate } from '@/lib/room-events';
import { getAuthenticatedSession, unauthorizedResponse } from '@/lib/session';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedSession(request);
    if (!session) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: '密码不能为空' },
        { status: 400 }
      );
    }

    const room = await prisma.room.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!room) {
      return NextResponse.json({ error: '房间不存在' }, { status: 404 });
    }

    if (room.status === 'finished') {
      return NextResponse.json({ error: '房间已结束，无法加入' }, { status: 400 });
    }

    if (room.password !== password) {
      return NextResponse.json({ error: '密码错误' }, { status: 400 });
    }

    const alreadyJoined = room.members.some((m) => m.userId === session.user.id);
    if (alreadyJoined) {
      return NextResponse.json({ joined: true });
    }

    const systemUser = await getOrCreateSystemUser();
    await prisma.$transaction([
      prisma.roomMember.create({
        data: { roomId: id, userId: session.user.id },
      }),
      prisma.score.create({
        data: {
          roomId: id,
          fromUserId: systemUser.id,
          toUserId: session.user.id,
          points: INITIAL_SCORE,
        },
      }),
      prisma.room.update({
        where: { id },
        data: {
          lastActivityAt: new Date(),
        },
      }),
    ]);

    broadcastRoomUpdate(id);

    return NextResponse.json({ joined: true });
  } catch (err) {
    console.error('Join room error:', err);
    return NextResponse.json(
      { error: '加入房间失败' },
      { status: 500 }
    );
  }
}
