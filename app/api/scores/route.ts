import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { roomId, fromUserId, toUserId, points } = await request.json();

    if (!roomId || !fromUserId || !toUserId || points == null) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const pointsNum = Number(points);
    if (pointsNum <= 0) {
      return NextResponse.json(
        { error: '分数必须大于 0' },
        { status: 400 }
      );
    }

    const score = await prisma.score.create({
      data: {
        roomId,
        fromUserId,
        toUserId,
        points: pointsNum,
      },
    });

    return NextResponse.json({
      score: {
        id: score.id,
        roomId: score.roomId,
        fromUserId: score.fromUserId,
        toUserId: score.toUserId,
        points: score.points,
        timestamp: score.timestamp.getTime(),
      },
    });
  } catch (err) {
    console.error('Add score error:', err);
    return NextResponse.json(
      { error: '添加分数失败' },
      { status: 500 }
    );
  }
}
