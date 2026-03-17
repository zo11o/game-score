import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { getOrCreateSystemUser, INITIAL_SCORE } from '@/lib/system-user';
import { serializeRoom } from '@/lib/room-response';
import { getAuthenticatedSession, unauthorizedResponse } from '@/lib/session';

const VALID_GAME_TYPES = new Set(['classic', 'poker_rounds']);
const VALID_ROUND_ORDER_MODES = new Set([
  'rotate_by_player_number',
  'random_each_round',
  'owner_sets_full_order',
  'owner_sets_first_player',
]);

export async function GET(request: NextRequest) {
  try {
    // 自动将 24 小时无活动的房间标记为已结束
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.room.updateMany({
      where: {
        status: 'active',
        lastActivityAt: {
          lt: twentyFourHoursAgo,
        },
      },
      data: {
        status: 'finished',
      },
    });

    // 只返回进行中的房间
    const rooms = await prisma.room.findMany({
      where: {
        status: 'active',
      },
      include: {
        members: {
          orderBy: { playerNumber: 'asc' },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(
      rooms.map((room) =>
        serializeRoom(room, room.creator, room.members.map((member) => member.userId))
      ),
      '获取房间列表成功'
    );
  } catch (err) {
    console.error('Get rooms error:', err);
    return errorResponse('获取房间列表失败', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthenticatedSession(request);
    if (!session) {
      return unauthorizedResponse();
    }

    const { name, password, gameType, roundOrderMode } = await request.json();

    if (!name || !password) {
      return errorResponse('房间名称和密码不能为空', 400);
    }

    if (gameType && !VALID_GAME_TYPES.has(gameType)) {
      return errorResponse('不支持的游戏类型', 400);
    }

    if (gameType === 'poker_rounds' && !roundOrderMode) {
      return NextResponse.json(
        { error: '扑克轮次房间需要选择每轮顺序规则' },
        { status: 400 }
      );
    }

    if (roundOrderMode && !VALID_ROUND_ORDER_MODES.has(roundOrderMode)) {
      return NextResponse.json(
        { error: '不支持的轮次顺序规则' },
        { status: 400 }
      );
    }

    // Get the next room number
    const lastRoom = await prisma.room.findFirst({
      orderBy: { roomNumber: 'desc' },
      select: { roomNumber: true },
    });
    const nextRoomNumber = (lastRoom?.roomNumber || 0) + 1;

    const room = await prisma.room.create({
      data: {
        name,
        password,
        status: 'active',
        roomNumber: nextRoomNumber,
        creatorId: session.user.id,
        gameType: gameType ?? 'classic',
        roundOrderMode: gameType === 'poker_rounds' ? roundOrderMode : 'rotate_by_player_number',
        lastActivityAt: new Date(),
        members: {
          create: { userId: session.user.id, playerNumber: 1 },
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const systemUser = await getOrCreateSystemUser();
    await prisma.score.create({
      data: {
        roomId: room.id,
        fromUserId: systemUser.id,
        toUserId: session.user.id,
        points: INITIAL_SCORE,
      },
    });

    return successResponse({
      room: serializeRoom(room, room.creator, [session.user.id]),
    }, '创建房间成功');
  } catch (err) {
    console.error('Create room error:', err);
    return errorResponse('创建房间失败', 500);
  }
}
