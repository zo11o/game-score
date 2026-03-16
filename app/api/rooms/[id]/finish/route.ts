import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        members: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: '房间不存在' }, { status: 404 });
    }

    if (!room.members.some((member) => member.userId === session.user.id)) {
      return NextResponse.json({ error: '你无权结束该房间' }, { status: 403 });
    }

    if (room.status === 'finished') {
      return NextResponse.json({ error: '房间已结束' }, { status: 400 });
    }

    await prisma.room.update({
      where: { id },
      data: {
        status: 'finished',
        lastActivityAt: new Date(),
      },
    });

    broadcastRoomUpdate(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Finish room error:', err);
    return NextResponse.json({ error: '结束房间失败' }, { status: 500 });
  }
}
