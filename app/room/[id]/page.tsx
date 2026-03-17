'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { api, getCurrentUser, isUnauthorizedError } from '@/lib/api';
import {
  buildTurnOrderPreview,
  getTurnOrderPositions,
  ROUND_ORDER_MODE_LABELS,
} from '@/lib/round-order';
import { useRoomSocket } from '@/lib/use-room-socket';
import { PageHeader } from '@/components/page-header';
import type {
  CurrentRound,
  DealAllocation,
  DealRoundPayload,
  PlayingCard,
  Room,
  RoomDetailsResponse,
  RoomDrawEvent,
  RoomUser,
  RoundHand,
  User,
  ScoreRecord,
} from '@/lib/types';
import { useRouter, useParams } from 'next/navigation';
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Card,
  CardBody,
  Input,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Chip,
  Spinner,
} from '@heroui/react';

const GAME_TYPE_LABELS: Record<Room['gameType'], string> = {
  classic: '经典记分',
  poker_rounds: '扑克轮次',
};

const DRAW_CARD_WIDTH = 56;
const DRAW_CARD_HEIGHT = 80;
const DEAL_ALLOCATIONS_STORAGE_PREFIX = 'game-score:deal-allocations:';
const DEFAULT_DEAL_COUNT = '7';
const SORTABLE_RANK_ORDER = ['RJ', 'BJ', 'A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
const SORTABLE_SUIT_ORDER: Record<PlayingCard['suit'], number> = {
  joker: 0,
  spades: 1,
  hearts: 2,
  clubs: 3,
  diamonds: 4,
};

type AnimatedDraw = RoomDrawEvent & {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

type DealAnimation = {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  delay: number;
  rotation: number;
};

function getHandForUser(currentRound: CurrentRound | null, userId: string): RoundHand | null {
  return currentRound?.hands.find((item) => item.userId === userId) ?? null;
}

function sortPlayingCards(cards: PlayingCard[]): PlayingCard[] {
  const rankPriority = new Map<string, number>(
    SORTABLE_RANK_ORDER.map((rank, index) => [rank, index])
  );

  return [...cards].sort((left, right) => {
    const leftRankKey = left.code === 'RJ' || left.code === 'BJ' ? left.code : left.rank;
    const rightRankKey = right.code === 'RJ' || right.code === 'BJ' ? right.code : right.rank;
    const rankDelta = (rankPriority.get(leftRankKey) ?? 999) - (rankPriority.get(rightRankKey) ?? 999);

    if (rankDelta !== 0) {
      return rankDelta;
    }

    const suitDelta = SORTABLE_SUIT_ORDER[left.suit] - SORTABLE_SUIT_ORDER[right.suit];
    if (suitDelta !== 0) {
      return suitDelta;
    }

    return left.code.localeCompare(right.code);
  });
}

function getCardScoreKey(card: PlayingCard): string {
  return card.code === 'RJ' || card.code === 'BJ' ? card.code : card.rank;
}

function getCardSummaryLabel(card: PlayingCard): string {
  return card.code === 'RJ' || card.code === 'BJ' ? card.label : card.rank;
}

function getDealAllocationStorageKey(roomId: string): string {
  return `${DEAL_ALLOCATIONS_STORAGE_PREFIX}${roomId}`;
}

function readDealAllocationCache(roomId: string): Record<string, string> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(getDealAllocationStorageKey(roomId));
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    );
  } catch {
    return {};
  }
}

function writeDealAllocationCache(roomId: string, allocations: Record<string, string>) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(getDealAllocationStorageKey(roomId), JSON.stringify(allocations));
  } catch {
    // Ignore storage errors and keep the in-memory allocations only.
  }
}

function RecordsPanel({
  records,
  formatTime,
}: {
  records: ScoreRecord[];
  formatTime: (ts: number) => string;
}) {
  return (
    <div className="space-y-3 max-h-[60vh] lg:max-h-[calc(100vh-12rem)] overflow-y-auto">
      {records.length === 0 ? (
        <p className="text-default-500 text-sm py-4 text-center">暂无记录</p>
      ) : (
        records.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 py-2 px-3 rounded-lg bg-default-100 border border-default-200"
          >
            <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden bg-default-200">
              <img
                src={r.fromAvatar}
                alt=""
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-default-700 truncate">
                <span className="font-medium text-primary">{r.fromName}</span>
                <span className="text-default-400 mx-1">→</span>
                <span className="font-medium text-secondary">{r.toName}</span>
              </p>
              <p className="text-xs text-default-500 mt-0.5">{formatTime(r.timestamp)}</p>
            </div>
            <span className="text-secondary font-bold shrink-0">+{r.points}</span>
          </div>
        ))
      )}
    </div>
  );
}

function CardFace({ card }: { card: PlayingCard }) {
  const colorClass =
    card.color === 'red'
      ? 'text-rose-400'
      : card.color === 'black'
        ? 'text-slate-100'
        : 'text-amber-300';
  const faceUpClasses = card.isFaceUp
    ? 'border-amber-400/80 shadow-[0_0_18px_rgba(251,191,36,0.25)]'
    : 'border-purple-500/30';

  return (
    <div className={`relative w-14 h-20 rounded-xl border bg-slate-950/90 shadow-sm flex flex-col items-center justify-center gap-1 ${faceUpClasses}`}>
      <span className={`text-sm font-bold leading-none ${colorClass}`}>{card.rank}</span>
      <span className={`text-[22px] font-bold leading-none ${colorClass}`}>{card.label.slice(-1)}</span>
    </div>
  );
}

function AnimatedCardFaceContent({
  card,
  faceUpLabel,
}: {
  card: PlayingCard;
  faceUpLabel?: string;
}) {
  return (
    <div className="relative [perspective:1000px]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${card.code}-${card.isFaceUp ? 'up' : 'down'}`}
          initial={{ rotateY: 90, opacity: 0.55, scale: 0.94 }}
          animate={{ rotateY: 0, opacity: 1, scale: 1 }}
          exit={{ rotateY: -90, opacity: 0.55, scale: 0.94 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <CardFace card={card} />
          {card.isFaceUp && faceUpLabel && (
            <span className="pointer-events-none absolute -right-2 -top-2 rounded-full border border-amber-300/80 bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-slate-950 shadow-md">
              {faceUpLabel}
            </span>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ClickableCardFace({
  card,
  faceUpLabel,
  onPress,
  isDisabled,
}: {
  card: PlayingCard;
  faceUpLabel?: string;
  onPress?: () => void;
  isDisabled?: boolean;
}) {
  const content = <AnimatedCardFaceContent card={card} faceUpLabel={faceUpLabel} />;

  if (!onPress) {
    return <div className="relative">{content}</div>;
  }

  const lastTouchTimestampRef = useRef(0);
  const suppressClickUntilRef = useRef(0);

  const triggerToggle = () => {
    if (isDisabled) {
      return;
    }

    onPress();
  };

  const handleDoubleClick = () => {
    triggerToggle();
  };

  const handleTouchEnd = () => {
    if (isDisabled) {
      return;
    }

    const now = Date.now();
    if (now - lastTouchTimestampRef.current <= 320) {
      lastTouchTimestampRef.current = 0;
      suppressClickUntilRef.current = now + 400;
      triggerToggle();
      return;
    }

    lastTouchTimestampRef.current = now;
  };

  const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (Date.now() < suppressClickUntilRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    event.preventDefault();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onTouchEnd={handleTouchEnd}
      disabled={isDisabled}
      className="relative select-none touch-manipulation transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      aria-label={`${card.label} ${card.isFaceUp ? '已亮牌，双击收回' : '未亮牌，双击公开'}`}
      title={card.isFaceUp ? '双击扣回这张牌' : '双击亮出这张牌'}
    >
      {content}
    </button>
  );
}

function CardBack({ className = '' }: { className?: string }) {
  return (
    <div
      className={`w-14 h-20 rounded-xl border border-pink-500/40 bg-gradient-to-br from-purple-700 via-slate-900 to-pink-600 shadow-sm flex items-center justify-center text-pink-100 text-sm font-bold ${className}`}
    >
      ?
    </div>
  );
}

function HandStrip({
  currentRound,
  hand,
  isSelf,
  showPeekButton,
  canPeek,
  isPeeking,
  onPeek,
  showDrawButton,
  canDraw,
  isDrawing,
  onDraw,
  onCardPress,
  isTogglingCard,
  shouldAnimatePeekReveal = false,
  showInteractionHint = true,
}: {
  currentRound: CurrentRound | null;
  hand: RoundHand | null;
  isSelf: boolean;
  showPeekButton: boolean;
  canPeek: boolean;
  isPeeking: boolean;
  onPeek: () => void;
  showDrawButton: boolean;
  canDraw: boolean;
  isDrawing: boolean;
  onDraw: () => void;
  onCardPress: (card: PlayingCard) => void;
  isTogglingCard: boolean;
  shouldAnimatePeekReveal?: boolean;
  showInteractionHint?: boolean;
}) {
  if (!currentRound) {
    return <p className="text-[11px] text-slate-500 mt-3 text-center">本轮未发牌</p>;
  }

  if (!hand?.isParticipant) {
    return <p className="text-[11px] text-slate-500 mt-3 text-center">本轮未参与</p>;
  }

  const visibleCount = hand.visibleCards.length;
  const hiddenCount = hand.hiddenCount;
  const hasCards = visibleCount > 0 || hiddenCount > 0;
  const hasPeeked = !isSelf || hand.hasPeeked;
  const displayCards = isSelf && hasPeeked ? sortPlayingCards(hand.visibleCards) : hand.visibleCards;
  const unrevealedCards = isSelf ? displayCards.filter((card) => !card.isFaceUp) : [];
  const suggestedScore = new Set(unrevealedCards.map(getCardScoreKey)).size;

  return (
    <div className="mt-3 w-full">
      <p className="text-[11px] text-slate-400 text-center mb-2">
        {isSelf && hasPeeked && visibleCount > 0 && showInteractionHint
          ? '双击卡牌可亮牌或扣回'
          : '本轮手牌'}
      </p>
      {hasCards ? (
        <div className="flex flex-wrap justify-center gap-2">
          {hasPeeked &&
            displayCards.map((card, index) => (
              <motion.div
                key={`${card.code}-${currentRound.roundNumber}-${hand.hasPeeked ? 'peeked' : 'hidden'}`}
                initial={
                  shouldAnimatePeekReveal
                    ? { rotateY: 180, opacity: 0.35, scale: 0.92, y: 10 }
                    : false
                }
                animate={{ rotateY: 0, opacity: 1, scale: 1, y: 0 }}
                transition={{
                  duration: 0.38,
                  delay: shouldAnimatePeekReveal ? index * 0.06 : 0,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="relative [perspective:1000px]"
              >
                <ClickableCardFace
                  card={card}
                  faceUpLabel={card.isFaceUp ? (isSelf ? '已亮' : '公开') : undefined}
                  onPress={isSelf ? () => onCardPress(card) : undefined}
                  isDisabled={isTogglingCard || !hand.hasPeeked}
                />
              </motion.div>
            ))}
          {Array.from({ length: hiddenCount }, (_, index) => (
            <CardBack key={`${hand.userId}-hidden-${index}`} />
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-slate-500 text-center">当前无手牌</p>
      )}

      {isSelf && showDrawButton && (
        <div className="mt-3 flex flex-col items-center gap-2">
          <div className="flex w-full flex-wrap items-center justify-center gap-2">
            {showPeekButton && (
              <Button
                size="sm"
                color="secondary"
                variant="shadow"
                onPress={onPeek}
                isDisabled={!canPeek}
                isLoading={isPeeking}
                className="whitespace-nowrap"
              >
                看牌
              </Button>
            )}
            <Button
              size="sm"
              color="warning"
              variant="flat"
              onPress={onDraw}
              isDisabled={!canDraw}
              isLoading={isDrawing}
              className="whitespace-nowrap"
            >
              {currentRound.remainingCardCount > 0 ? '抽一张' : '牌堆已空'}
            </Button>
          </div>
          {hand.hasPeeked ? (
            <div className="w-full rounded-2xl border border-emerald-500/35 bg-slate-950/35 px-3 py-3">
              <p className="text-[11px] text-center uppercase tracking-[0.24em] text-emerald-300/80">
                未亮牌统计
              </p>
              {unrevealedCards.length > 0 ? (
                <>
                  <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                    {unrevealedCards.map((card, index) => (
                      <span
                        key={`${card.code}-${index}`}
                        className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-100"
                      >
                        {getCardSummaryLabel(card)}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-center text-emerald-100">
                    应给分: <span className="font-bold text-emerald-300">{suggestedScore}</span>
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-center text-slate-400">未亮牌已全部公开，应给分 0</p>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-center text-slate-500">看牌后可查看未亮牌统计和亮牌操作。</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function RoomPage() {
  const [room, setRoom] = useState<Room | null>(null);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [records, setRecords] = useState<ScoreRecord[]>([]);
  const [currentRound, setCurrentRound] = useState<CurrentRound | null>(null);
  const [selectedUser, setSelectedUser] = useState<RoomUser | null>(null);
  const [points, setPoints] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isDrawingCard, setIsDrawingCard] = useState(false);
  const [isPeekingHand, setIsPeekingHand] = useState(false);
  const [isTogglingCard, setIsTogglingCard] = useState(false);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [manualOrderedUserIds, setManualOrderedUserIds] = useState<string[]>([]);
  const [selectedFirstUserId, setSelectedFirstUserId] = useState<string | null>(null);
  const [pendingDraws, setPendingDraws] = useState<RoomDrawEvent[]>([]);
  const [activeDraw, setActiveDraw] = useState<AnimatedDraw | null>(null);
  const [dealAnimations, setDealAnimations] = useState<DealAnimation[]>([]);
  const [peekRevealRoundNumber, setPeekRevealRoundNumber] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const deckRef = useRef<HTMLDivElement | null>(null);
  const playerAreaRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const queuedRoomDataRef = useRef<RoomDetailsResponse | null>(null);
  const hasPendingAnimationRef = useRef(false);
  const previousRoundNumberRef = useRef<number | null | undefined>(undefined);
  const recordsDrawer = useDisclosure();
  const dealRoundModal = useDisclosure();
  const giveScoreModal = useDisclosure();
  const errorModal = useDisclosure();
  const successModal = useDisclosure();
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;

  const showError = (message: string) => {
    setErrorMessage(message);
    errorModal.onOpen();
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    successModal.onOpen();
  };

  const setPlayerAreaRef = useCallback(
    (userId: string) => (node: HTMLDivElement | null) => {
      playerAreaRefs.current[userId] = node;
    },
    []
  );

  const applyRoomData = useCallback((data: RoomDetailsResponse) => {
    setRoom(data.room);
    setUsers(data.users);
    setScores(data.scores);
    setRecords(data.records ?? []);
    setCurrentRound(data.currentRound ?? null);
    setIsDrawingCard(false);
  }, []);

  const flushQueuedRoomData = useCallback(() => {
    const queuedRoomData = queuedRoomDataRef.current;
    queuedRoomDataRef.current = null;

    if (queuedRoomData) {
      applyRoomData(queuedRoomData);
      return;
    }

    setIsDrawingCard(false);
  }, [applyRoomData]);

  const fetchRoom = useCallback(() => {
    return api
      .getRoom(roomId)
      .then((data) => {
        if (hasPendingAnimationRef.current) {
          queuedRoomDataRef.current = data;
          return;
        }
        applyRoomData(data);
      })
      .catch((err) => {
        if (isUnauthorizedError(err)) {
          router.push('/login');
          return;
        }
        router.push('/');
      });
  }, [applyRoomData, roomId, router]);

  const handleRoomDraw = useCallback(
    (event: RoomDrawEvent) => {
      if (event.roomId !== roomId) {
        return;
      }

      hasPendingAnimationRef.current = true;
      setPendingDraws((prev) => [...prev, event]);
    },
    [roomId]
  );

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
    fetchRoom().finally(() => setLoading(false));
  }, [fetchRoom, router]);

  useRoomSocket(roomId, {
    onUpdate: fetchRoom,
    onDraw: handleRoomDraw,
  });

  useEffect(() => {
    if (activeDraw || pendingDraws.length === 0) {
      return;
    }

    const [nextDraw, ...rest] = pendingDraws;
    setPendingDraws(rest);

    const deckElement = deckRef.current;
    const targetElement = playerAreaRefs.current[nextDraw.toUserId];

    if (!deckElement || !targetElement) {
      return;
    }

    const deckRect = deckElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();

    setActiveDraw({
      ...nextDraw,
      startX: deckRect.left + deckRect.width / 2 - DRAW_CARD_WIDTH / 2,
      startY: deckRect.top + deckRect.height / 2 - DRAW_CARD_HEIGHT / 2,
      endX: targetRect.left + targetRect.width / 2 - DRAW_CARD_WIDTH / 2,
      endY: targetRect.top + targetRect.height / 2 - DRAW_CARD_HEIGHT / 2,
    });
  }, [activeDraw, pendingDraws]);

  useEffect(() => {
    if (activeDraw || pendingDraws.length > 0 || !hasPendingAnimationRef.current) {
      return;
    }

    hasPendingAnimationRef.current = false;
    flushQueuedRoomData();
  }, [activeDraw, flushQueuedRoomData, pendingDraws.length]);

  useEffect(() => {
    const nextRoundNumber = currentRound?.roundNumber ?? null;
    const previousRoundNumber = previousRoundNumberRef.current;

    if (previousRoundNumber === undefined) {
      previousRoundNumberRef.current = nextRoundNumber;
      return;
    }

    if (
      currentRound &&
      nextRoundNumber !== null &&
      nextRoundNumber !== previousRoundNumber &&
      deckRef.current
    ) {
      const deckRect = deckRef.current.getBoundingClientRect();
      let animationIndex = 0;
      const handsByUserId = new Map(currentRound.hands.map((hand) => [hand.userId, hand]));
      const animationOrder =
        currentRound.turnOrderUserIds.length > 0
          ? currentRound.turnOrderUserIds
          : currentRound.hands.map((hand) => hand.userId);

      const nextAnimations = animationOrder.flatMap((userId) => {
        const hand = handsByUserId.get(userId);
        if (!hand) {
          return [];
        }

        const targetElement = playerAreaRefs.current[hand.userId];
        if (!targetElement) {
          return [];
        }

        const targetRect = targetElement.getBoundingClientRect();
        const totalCards = hand.visibleCards.length + hand.hiddenCount;

        return Array.from({ length: totalCards }, (_, cardIndex) => {
          const currentIndex = animationIndex++;

          return {
            id: `deal-${currentRound.roundNumber}-${hand.userId}-${cardIndex}`,
            startX: deckRect.left + deckRect.width / 2 - DRAW_CARD_WIDTH / 2,
            startY: deckRect.top + deckRect.height / 2 - DRAW_CARD_HEIGHT / 2,
            endX: targetRect.left + targetRect.width / 2 - DRAW_CARD_WIDTH / 2,
            endY: targetRect.top + targetRect.height / 2 - DRAW_CARD_HEIGHT / 2,
            delay: currentIndex * 0.045,
            rotation: ((currentIndex % 5) - 2) * 7,
          };
        });
      });

      if (nextAnimations.length > 0) {
        setDealAnimations(nextAnimations);
      }
    }

    previousRoundNumberRef.current = nextRoundNumber;
  }, [currentRound]);

  const isOwner = !!room && !!currentUser && room.creatorId === currentUser.id;
  const isPokerRoom = room?.gameType === 'poker_rounds';
  const roomModalClassNames = {
    wrapper: 'px-3 sm:px-6',
    base: 'w-full max-w-[calc(100vw-1.5rem)] bg-slate-800 border border-purple-500/50 sm:max-w-md',
    header: 'border-b border-default-200 px-4 py-4 sm:px-6',
    body: 'px-4 py-5 sm:px-6 sm:py-6',
    footer: 'flex-col-reverse gap-2 border-t border-default-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-6',
  } as const;
  const orderedUsers = useMemo(
    () => [...users].sort((left, right) => left.playerNumber - right.playerNumber),
    [users]
  );
  const nextRoundNumber = (currentRound?.roundNumber ?? 0) + 1;
  const participantUserIds = useMemo(
    () => orderedUsers.map((user) => user.id),
    [orderedUsers]
  );
  const currentTurnOrderPositions = useMemo(
    () => getTurnOrderPositions(currentRound?.turnOrderUserIds ?? []),
    [currentRound?.turnOrderUserIds]
  );
  const requiresFullManualOrder = room?.roundOrderMode === 'owner_sets_full_order' && nextRoundNumber > 1;
  const requiresFirstPlayerSelection =
    room?.roundOrderMode === 'owner_sets_first_player' && nextRoundNumber > 1;
  const nextRoundPreviewUserIds = useMemo(() => {
    if (!room) {
      return [];
    }

    return buildTurnOrderPreview(room.roundOrderMode, participantUserIds, nextRoundNumber, {
      orderedUserIds: manualOrderedUserIds,
      firstUserId: selectedFirstUserId,
    });
  }, [manualOrderedUserIds, nextRoundNumber, orderedUsers, participantUserIds, room, selectedFirstUserId]);
  const nextRoundPreviewUsers = useMemo(
    () =>
      nextRoundPreviewUserIds
        .map((userId) => orderedUsers.find((user) => user.id === userId))
        .filter((user): user is RoomUser => Boolean(user)),
    [nextRoundPreviewUserIds, orderedUsers]
  );
  const currentUserHand = useMemo(
    () => (currentUser ? getHandForUser(currentRound, currentUser.id) : null),
    [currentRound, currentUser]
  );
  const canPeekHand =
    !!currentUserHand &&
    currentUserHand.isParticipant &&
    !currentUserHand.hasPeeked &&
    currentUserHand.hiddenCount > 0 &&
    room?.status === 'active';

  const roundTotal = useMemo(
    () => orderedUsers.reduce((sum, user) => sum + Number(allocations[user.id] ?? 0), 0),
    [allocations, orderedUsers]
  );

  const drawInteractionLocked = isDrawingCard || !!activeDraw || pendingDraws.length > 0;
  const showDrawButton =
    !!currentUser &&
    !!currentRound &&
    room?.status === 'active' &&
    currentUserHand?.isParticipant === true;
  const canDraw =
    showDrawButton &&
    currentRound.remainingCardCount > 0 &&
    !drawInteractionLocked;

  useEffect(() => {
    if (peekRevealRoundNumber === null) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setPeekRevealRoundNumber(null);
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [peekRevealRoundNumber]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('zh-CN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  const openDealModal = () => {
    const cachedAllocations = readDealAllocationCache(roomId);
    const nextAllocations = orderedUsers.reduce<Record<string, string>>((acc, user) => {
      acc[user.id] = cachedAllocations[user.id] ?? DEFAULT_DEAL_COUNT;
      return acc;
    }, {});
    setAllocations(nextAllocations);
    setManualOrderedUserIds([]);
    setSelectedFirstUserId(null);
    dealRoundModal.onOpen();
  };

  const appendManualOrderUser = (userId: string) => {
    setManualOrderedUserIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
  };

  const clearManualOrder = () => {
    setManualOrderedUserIds([]);
  };

  const selectFirstPlayer = (userId: string) => {
    setSelectedFirstUserId(userId);
  };

  const handleGiveScore = async () => {
    if (!selectedUser || !currentUser) return;

    try {
      await api.addScore(roomId, selectedUser.id, points);
      setScores((prev) => ({
        ...prev,
        [selectedUser.id]: (prev[selectedUser.id] || 0) + points,
        [currentUser.id]: (prev[currentUser.id] || 0) - points,
      }));
      setRecords((prev) => [
        {
          id: `temp-${Date.now()}`,
          fromUserId: currentUser.id,
          fromName: currentUser.name,
          fromAvatar: currentUser.avatar,
          toUserId: selectedUser.id,
          toName: selectedUser.name,
          toAvatar: selectedUser.avatar,
          points,
          timestamp: Date.now(),
        },
        ...prev,
      ]);
      setSelectedUser(null);
      setPoints(1);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        router.push('/login');
        return;
      }
      showError(err instanceof Error ? err.message : '添加分数失败');
    }
  };

  const handleDealRound = async () => {
    if (!room || !isOwner) return;

    if (roundTotal < 1 || roundTotal > 54) {
      showError('本轮总发牌数必须在 1 到 54 张之间');
      return;
    }

    const payload: DealRoundPayload = {
      allocations: orderedUsers.map((user) => ({
        userId: user.id,
        cardCount: Number(allocations[user.id] ?? 0),
      })),
    };

    if (requiresFullManualOrder) {
      if (manualOrderedUserIds.length !== orderedUsers.length) {
        showError('请依次选出本轮所有玩家的完整顺序');
        return;
      }

      payload.orderedUserIds = manualOrderedUserIds;
    }

    if (requiresFirstPlayerSelection) {
      if (!selectedFirstUserId) {
        showError('请先选择本轮的首位玩家');
        return;
      }

      payload.firstUserId = selectedFirstUserId;
    }

    try {
      await api.dealRound(room.id, payload);
      writeDealAllocationCache(room.id, allocations);
      dealRoundModal.onClose();
      setManualOrderedUserIds([]);
      setSelectedFirstUserId(null);
      await fetchRoom();
    } catch (err) {
      if (isUnauthorizedError(err)) {
        router.push('/login');
        return;
      }
      showError(err instanceof Error ? err.message : '发牌失败');
    }
  };

  const handleDrawCard = async () => {
    if (!room || !canDraw) {
      return;
    }

    setIsDrawingCard(true);

    try {
      await api.drawCard(room.id);
    } catch (err) {
      setIsDrawingCard(false);
      if (isUnauthorizedError(err)) {
        router.push('/login');
        return;
      }
      showError(err instanceof Error ? err.message : '抽牌失败');
    }
  };

  const handlePeekHand = async () => {
    if (!room || !currentRound || !canPeekHand) {
      return;
    }

    setIsPeekingHand(true);

    try {
      await api.peekHand(room.id);
      setPeekRevealRoundNumber(currentRound.roundNumber);
      await fetchRoom();
    } catch (err) {
      if (isUnauthorizedError(err)) {
        router.push('/login');
        return;
      }
      showError(err instanceof Error ? err.message : '看牌失败');
    } finally {
      setIsPeekingHand(false);
    }
  };

  const handleToggleCardVisibility = async (card: PlayingCard) => {
    if (!room) {
      return;
    }

    setIsTogglingCard(true);

    try {
      await api.toggleCardVisibility(room.id, card.code);
      await fetchRoom();
    } catch (err) {
      if (isUnauthorizedError(err)) {
        router.push('/login');
        return;
      }
      showError(err instanceof Error ? err.message : '翻牌失败');
    } finally {
      setIsTogglingCard(false);
    }
  };

  const handleFinishRoom = async () => {
    if (!confirm('确定要结束游戏吗？结束后将无法继续打分。')) return;

    try {
      await api.finishRoom(roomId);
      showSuccess('游戏已结束');
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        router.push('/login');
        return;
      }
      showError(err instanceof Error ? err.message : '结束游戏失败');
    }
  };

  if (!currentUser) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Spinner size="lg" color="secondary" />
      </div>
    );
  }

  if (!room) return null;

  const renderUserCard = (user: RoomUser) => {
    const hand = getHandForUser(currentRound, user.id);
    const isSelf = user.id === currentUser.id;
    const roundPosition = currentTurnOrderPositions.get(user.id);
    const roundOrderDelay = roundPosition
      ? room.roundOrderMode === 'random_each_round'
        ? roundPosition * 0.08
        : roundPosition * 0.04
      : 0;

    return (
      <div
        key={user.id}
        ref={setPlayerAreaRef(user.id)}
        className="relative min-w-[280px] flex-1 basis-[320px]"
      >
        <Card
          isPressable={room.status === 'active' && user.id !== currentUser.id}
          aria-label={isSelf ? `${user.name} 当前分数` : `给 ${user.name} 打分`}
          onClick={() =>
            room.status === 'active' && user.id !== currentUser.id && setSelectedUser(user)
          }
          onPress={() =>
            room.status === 'active' && user.id !== currentUser.id && setSelectedUser(user)
          }
          className={
            isSelf
              ? 'relative w-full bg-slate-800/60 border border-secondary/40 shadow-[0_18px_45px_rgba(31,41,55,0.35)]'
              : 'relative w-full bg-slate-800/50 border border-purple-500/30 hover:border-purple-500'
          }
        >
          <CardBody className="flex flex-col gap-3 p-4 sm:p-5">
            <div
              className={
                isSelf
                  ? 'flex w-full flex-wrap items-center gap-3 rounded-2xl border border-secondary/25 bg-slate-950/25 p-3 sm:p-4'
                  : 'flex w-full flex-wrap items-center gap-3 rounded-2xl border border-purple-500/20 bg-slate-950/20 p-3'
              }
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div
                  className={
                    isSelf
                      ? 'h-16 w-16 rounded-full overflow-hidden border-4 border-secondary shrink-0 sm:h-20 sm:w-20'
                      : 'h-14 w-14 rounded-full overflow-hidden border-4 border-purple-500 shrink-0 sm:h-16 sm:w-16'
                  }
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3
                      className={
                        isSelf
                          ? 'truncate text-lg font-bold text-secondary-300 sm:text-2xl'
                          : 'truncate text-base font-bold text-purple-300 sm:text-lg'
                      }
                    >
                      {user.name}
                    </h3>
                    {isSelf && <Chip size="sm" color="secondary">你</Chip>}
                  </div>
                  <p className={isSelf ? 'mt-1 text-xs text-slate-400 sm:text-sm' : 'mt-0.5 text-[11px] text-slate-400 sm:text-xs'}>
                    {isSelf ? '当前玩家' : '房间成员'}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-100">
                      玩家 {user.playerNumber}
                    </span>
                    {isPokerRoom && roundPosition && (
                      <motion.span
                        key={`round-order-${currentRound?.roundNumber ?? 0}-${user.id}-${roundPosition}`}
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.28, delay: roundOrderDelay, ease: [0.22, 1, 0.36, 1] }}
                        className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-100"
                      >
                        本轮第 {roundPosition} 位
                      </motion.span>
                    )}
                  </div>
                  {isPokerRoom && isSelf && (
                    <p className="mt-2 text-[11px] text-amber-300/80 sm:text-xs">
                      双击卡牌可亮牌或扣回
                    </p>
                  )}
                </div>
              </div>
              <div
                className={
                  isSelf
                    ? 'ml-auto shrink-0 rounded-2xl bg-slate-900/70 px-4 py-3 text-center sm:min-w-[132px]'
                    : 'ml-auto shrink-0 rounded-xl bg-slate-900/70 px-3 py-2 text-center min-w-[88px]'
                }
              >
                <div className={isSelf ? 'text-3xl font-bold text-pink-400 sm:text-4xl' : 'text-2xl font-bold text-pink-400'}>
                  {scores[user.id] || 0}
                </div>
                <p className={isSelf ? 'mt-1 text-xs text-slate-400 sm:text-sm' : 'mt-0.5 text-[11px] text-slate-400'}>
                  分数
                </p>
              </div>
            </div>
            {isPokerRoom && (
              <div className="w-full">
                <HandStrip
                  currentRound={currentRound}
                  hand={hand}
                  isSelf={isSelf}
                  showPeekButton={isSelf && hand?.hasPeeked === false}
                  canPeek={isSelf && canPeekHand}
                  isPeeking={isSelf && isPeekingHand}
                  onPeek={handlePeekHand}
                  showDrawButton={isSelf && showDrawButton}
                  canDraw={isSelf && canDraw}
                  isDrawing={isSelf && drawInteractionLocked}
                  onDraw={handleDrawCard}
                  onCardPress={handleToggleCardVisibility}
                  isTogglingCard={isSelf && isTogglingCard}
                  shouldAnimatePeekReveal={isSelf && peekRevealRoundNumber === currentRound?.roundNumber}
                  showInteractionHint={!isSelf}
                />
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-6">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 max-w-7xl mx-auto">
        <div className="flex-1 min-w-0">
          <PageHeader
            title={room.name}
            subtitle={`房间号 #${room.roomNumber} · 房主: ${room.creatorName}`}
            showBackButton
            showHomeButton
            titleSuffix={(
              <>
                {room.status === 'finished' && (
                  <Chip color="danger" variant="flat">已结束</Chip>
                )}
                {room.status === 'active' && (
                  <Chip color="success" variant="flat">进行中</Chip>
                )}
                <Chip variant="flat" color={room.gameType === 'poker_rounds' ? 'secondary' : 'default'}>
                  {GAME_TYPE_LABELS[room.gameType]}
                </Chip>
              </>
            )}
            actions={(
              <div className="flex flex-wrap gap-2">
                {isPokerRoom && room.status === 'active' && isOwner && (
                  <Button
                    color="secondary"
                    variant="shadow"
                    onPress={openDealModal}
                    className="whitespace-nowrap"
                  >
                    {currentRound ? '发下一轮' : '开始第一轮'}
                  </Button>
                )}
                {room.status === 'active' && (
                  <Button
                    color="danger"
                    variant="flat"
                    onPress={handleFinishRoom}
                    className="whitespace-nowrap"
                  >
                    结束游戏
                  </Button>
                )}
              </div>
            )}
            contentBelow={isPokerRoom ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Chip color="warning" variant="flat">
                  {currentRound ? `第 ${currentRound.roundNumber} 轮` : '未发牌'}
                </Chip>
                <Chip color="secondary" variant="flat">
                  顺序规则：{ROUND_ORDER_MODE_LABELS[room.roundOrderMode]}
                </Chip>
                {currentRound && (
                  <span className="text-xs sm:text-sm text-slate-400">
                    最近发牌: {formatTime(currentRound.dealtAt)}
                  </span>
                )}
                <div className="flex items-center gap-3 rounded-2xl border border-pink-500/30 bg-slate-900/70 px-4 py-3">
                  <div ref={deckRef} className="relative h-20 w-14 shrink-0">
                    <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-lg border border-purple-500/20 bg-slate-950/60" />
                    <CardBack className="absolute inset-0" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-pink-300/70">公共牌堆</p>
                    <p className="text-sm font-semibold text-slate-100">
                      {currentRound ? `剩余 ${currentRound.remainingCardCount} 张` : '等待房主发牌'}
                    </p>
                  </div>
                </div>
              </div>
            ) : undefined}
            className="mb-6"
          />

          <div className="flex flex-wrap gap-4 sm:gap-6">
            {orderedUsers.map((user) => renderUserCard(user))}
          </div>

          <Modal
            isOpen={!!selectedUser}
            onOpenChange={(open) => !open && setSelectedUser(null)}
            placement="center"
            size="md"
            scrollBehavior="inside"
            classNames={roomModalClassNames}
          >
            <ModalContent>
              {selectedUser && (
                <>
                  <ModalHeader className="flex flex-col gap-1 text-purple-400">
                    给 {selectedUser.name} 打分
                  </ModalHeader>
                  <ModalBody>
                    <div className="mb-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-purple-500 shrink-0">
                        <img
                          src={selectedUser.avatar}
                          alt={selectedUser.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="text-3xl sm:text-4xl font-bold text-pink-400">
                        {scores[selectedUser.id] || 0}
                      </div>
                    </div>
                    <Input
                      type="number"
                      value={String(points)}
                      onValueChange={(v) => setPoints(Number(v) || 0)}
                      min={1}
                      placeholder="请输入分数"
                      aria-label="分数"
                      classNames={{
                        input: 'text-center',
                        inputWrapper: 'bg-slate-900',
                      }}
                    />
                  </ModalBody>
                  <ModalFooter>
                    <Button
                      variant="light"
                      onPress={() => {
                        setSelectedUser(null);
                        setPoints(1);
                      }}
                      className="w-full whitespace-nowrap sm:w-auto"
                    >
                      取消
                    </Button>
                    <Button
                      color="secondary"
                      onPress={handleGiveScore}
                      className="w-full whitespace-nowrap sm:w-auto"
                    >
                      确认
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>

          <Modal
            isOpen={dealRoundModal.isOpen}
            onOpenChange={dealRoundModal.onOpenChange}
            placement="center"
            scrollBehavior="inside"
            classNames={{
              ...roomModalClassNames,
              base: 'w-full max-w-[calc(100vw-1.5rem)] bg-slate-800 border border-purple-500/50 sm:max-w-2xl',
            }}
          >
            <ModalContent>
              <ModalHeader className="flex flex-col gap-1 text-purple-400">
                {currentRound ? `配置第 ${currentRound.roundNumber + 1} 轮发牌` : '配置第一轮发牌'}
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-slate-400">
                  每轮都会重新收牌、洗出一副全新的 54 张扑克牌；未发出的牌会保留为本轮剩余牌堆，供后续抽牌使用。
                </p>
                <div className="rounded-xl border border-sky-500/20 bg-slate-900/60 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-sky-300/70">本房顺序规则</p>
                  <p className="mt-2 text-sm font-semibold text-slate-100">
                    {ROUND_ORDER_MODE_LABELS[room.roundOrderMode]}
                  </p>
                </div>
                <div className="space-y-3">
                  {orderedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex flex-col gap-3 rounded-xl border border-purple-500/20 bg-slate-900/60 p-3 sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-purple-500/40">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-100">{user.name}</p>
                          <p className="text-xs text-slate-500">
                            玩家 {user.playerNumber} {user.id === currentUser.id ? '· 你' : '· 房间成员'}
                          </p>
                        </div>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        value={allocations[user.id] ?? DEFAULT_DEAL_COUNT}
                        aria-label={`${user.name} 发牌张数`}
                        onValueChange={(value) =>
                          setAllocations((prev) => ({
                            ...prev,
                            [user.id]: value,
                          }))
                        }
                        className="w-28"
                        classNames={{
                          input: 'text-center',
                          inputWrapper: 'bg-slate-950/90',
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-pink-500/30 bg-pink-500/10 px-4 py-3 text-sm text-pink-200">
                  本轮总发牌数: <span className="font-bold">{roundTotal}</span> / 54
                </div>
                {room.roundOrderMode === 'rotate_by_player_number' && (
                  <div className="rounded-xl border border-amber-500/20 bg-slate-900/60 px-4 py-3">
                    <p className="text-sm text-slate-300">本轮将按玩家号轮换自动确定顺序。</p>
                  </div>
                )}
                {room.roundOrderMode === 'random_each_round' && (
                  <div className="rounded-xl border border-amber-500/20 bg-slate-900/60 px-4 py-3">
                    <p className="text-sm text-slate-300">确认发牌后，将为本轮所有玩家随机生成顺序并播放揭示动画。</p>
                  </div>
                )}
                {room.roundOrderMode === 'owner_sets_full_order' && nextRoundNumber > 1 && (
                  <div className="rounded-xl border border-amber-500/20 bg-slate-900/60 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">依次点人生成本轮完整顺序</p>
                        <p className="text-xs text-slate-500">点过的玩家会依次拿到第 1、2、3... 位</p>
                      </div>
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={clearManualOrder}
                        isDisabled={manualOrderedUserIds.length === 0}
                      >
                        清空顺序
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {manualOrderedUserIds.length > 0 ? (
                        manualOrderedUserIds.map((userId, index) => {
                          const selectedUser = orderedUsers.find((user) => user.id === userId);
                          if (!selectedUser) {
                            return null;
                          }

                          return (
                            <span
                              key={userId}
                              className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-100"
                            >
                              {index + 1}. 玩家 {selectedUser.playerNumber} {selectedUser.name}
                            </span>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-500">还没有选择本轮顺序。</p>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {orderedUsers.map((user) => {
                        const selectedIndex = manualOrderedUserIds.indexOf(user.id);

                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => appendManualOrderUser(user.id)}
                            disabled={selectedIndex !== -1}
                            className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                              selectedIndex !== -1
                                ? 'cursor-not-allowed border-amber-400/40 bg-amber-500/10 text-amber-100'
                                : 'border-purple-500/30 bg-slate-950/70 text-slate-100 hover:border-purple-400'
                            }`}
                          >
                            <div className="font-semibold">玩家 {user.playerNumber} {user.name}</div>
                            <div className="mt-1 text-xs text-slate-400">
                              {selectedIndex !== -1 ? `已选为第 ${selectedIndex + 1} 位` : '点击加入顺序'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {room.roundOrderMode === 'owner_sets_first_player' && nextRoundNumber > 1 && (
                  <div className="rounded-xl border border-amber-500/20 bg-slate-900/60 px-4 py-4">
                    <p className="text-sm font-semibold text-slate-100">选择本轮首位玩家</p>
                    <p className="mt-1 text-xs text-slate-500">其余玩家会按玩家号顺延。</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {orderedUsers.map((user) => {
                        const isSelected = selectedFirstUserId === user.id;

                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => selectFirstPlayer(user.id)}
                            className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                              isSelected
                                ? 'border-amber-400/40 bg-amber-500/10 text-amber-100'
                                : 'border-purple-500/30 bg-slate-950/70 text-slate-100 hover:border-purple-400'
                            }`}
                          >
                            <div className="font-semibold">玩家 {user.playerNumber} {user.name}</div>
                            <div className="mt-1 text-xs text-slate-400">
                              {isSelected ? '已设为首位玩家' : '点击设为首位'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {(room.roundOrderMode !== 'random_each_round') && (
                  <div className="rounded-xl border border-emerald-500/25 bg-slate-950/45 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/70">下轮顺序预览</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {nextRoundPreviewUsers.map((user, index) => (
                        <span
                          key={user.id}
                          className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100"
                        >
                          {index + 1}. 玩家 {user.playerNumber} {user.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={dealRoundModal.onClose} className="w-full whitespace-nowrap sm:w-auto">
                  取消
                </Button>
                <Button color="secondary" onPress={handleDealRound} className="w-full whitespace-nowrap sm:w-auto">
                  确认发牌
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </div>

        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-6 bg-slate-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4">
            <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
              <span>支付记录</span>
              <Chip size="sm" variant="flat">{records.length}</Chip>
            </h3>
            <RecordsPanel records={records} formatTime={formatTime} />
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {dealAnimations.map((animation) => (
          <motion.div
            key={animation.id}
            className="pointer-events-none fixed left-0 top-0 z-[68]"
            initial={{
              x: animation.startX,
              y: animation.startY,
              rotate: -14,
              scale: 0.88,
              opacity: 0,
            }}
            animate={{
              x: animation.endX,
              y: animation.endY,
              rotate: animation.rotation,
              scale: 1,
              opacity: 1,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.58,
              delay: animation.delay,
              ease: [0.22, 1, 0.36, 1],
            }}
            onAnimationComplete={() => {
              setDealAnimations((prev) => prev.filter((item) => item.id !== animation.id));
            }}
          >
            <CardBack className="shadow-[0_18px_40px_rgba(15,23,42,0.35)]" />
          </motion.div>
        ))}
        {activeDraw && (
          <motion.div
            key={activeDraw.drawId}
            className="pointer-events-none fixed left-0 top-0 z-[70]"
            initial={{ x: activeDraw.startX, y: activeDraw.startY, rotate: -16, scale: 0.92, opacity: 0.95 }}
            animate={{
              x: activeDraw.endX,
              y: activeDraw.endY,
              rotate: 10,
              scale: 1.02,
              opacity: 1,
            }}
            transition={{
              duration: 0.75,
              ease: [0.22, 1, 0.36, 1],
            }}
            onAnimationComplete={() => setActiveDraw(null)}
          >
            <CardBack />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <Button
          isIconOnly
          color="secondary"
          size="lg"
          aria-label="支付记录"
          onPress={recordsDrawer.onOpen}
          className="shadow-lg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </Button>
        {records.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-xs font-bold text-white">
            {records.length}
          </span>
        )}
      </div>

      <Drawer
        isOpen={recordsDrawer.isOpen}
        onOpenChange={recordsDrawer.onOpenChange}
        placement="bottom"
        size="lg"
        classNames={{
          base: 'bg-slate-800 border-t border-purple-500/30',
          header: 'border-b border-default-200',
        }}
      >
        <DrawerContent>
          <DrawerHeader className="flex flex-col gap-1">
            <h3 className="text-lg font-bold text-purple-400">支付记录</h3>
            <p className="text-sm text-default-500">{records.length} 条记录</p>
          </DrawerHeader>
          <DrawerBody>
            <RecordsPanel records={records} formatTime={formatTime} />
          </DrawerBody>
          <DrawerFooter>
            <Button color="default" variant="flat" onPress={recordsDrawer.onClose} className="whitespace-nowrap">
              关闭
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Modal
        isOpen={errorModal.isOpen}
        onOpenChange={errorModal.onOpenChange}
        placement="center"
        backdrop="opaque"
        classNames={{
          base: '!bg-slate-800 border border-red-500/50',
          backdrop: 'bg-black/70',
        }}
      >
        <ModalContent className="!bg-slate-800 border border-red-500/50">
          <ModalHeader className="flex flex-col gap-1 text-red-400">提示</ModalHeader>
          <ModalBody>
            <p className="text-slate-200">{errorMessage}</p>
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="light" onPress={errorModal.onClose}>
              确定
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={successModal.isOpen}
        onOpenChange={successModal.onOpenChange}
        placement="center"
        backdrop="opaque"
        classNames={{
          base: '!bg-slate-800 border border-green-500/50',
          backdrop: 'bg-black/70',
        }}
      >
        <ModalContent className="!bg-slate-800 border border-green-500/50">
          <ModalHeader className="flex flex-col gap-1 text-green-400">成功</ModalHeader>
          <ModalBody>
            <p className="text-slate-200">{successMessage}</p>
          </ModalBody>
          <ModalFooter>
            <Button color="success" variant="light" onPress={successModal.onClose}>
              确定
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
