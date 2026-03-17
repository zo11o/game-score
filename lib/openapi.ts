const ref = (name: string) => ({
  $ref: `#/components/schemas/${name}`,
});

const arrayOf = (schema: Record<string, unknown>) => ({
  type: 'array',
  items: schema,
});

const envelope = (
  dataSchema: Record<string, unknown>,
  messageExample = '请求成功'
) => ({
  type: 'object',
  required: ['code', 'message', 'data'],
  properties: {
    code: {
      type: 'integer',
      example: 0,
    },
    message: {
      type: 'string',
      example: messageExample,
    },
    data: dataSchema,
  },
});

const errorEnvelope = (status: number, message: string) => ({
  type: 'object',
  required: ['code', 'message', 'data'],
  properties: {
    code: {
      type: 'integer',
      example: status,
    },
    message: {
      type: 'string',
      example: message,
    },
    data: {
      nullable: true,
      example: null,
    },
  },
});

const jsonContent = (schema: Record<string, unknown>) => ({
  'application/json': {
    schema,
  },
});

const success = (
  schema: Record<string, unknown>,
  messageExample?: string,
  description = '请求成功'
) => ({
  description,
  content: jsonContent(envelope(schema, messageExample)),
});

const error = (status: number, message: string, description?: string) => ({
  description: description ?? message,
  content: jsonContent(errorEnvelope(status, message)),
});

const authSecurity = [{ cookieAuth: [] }];

export function getOpenApiDocument(serverUrl?: string) {
  return {
    openapi: '3.0.3',
    info: {
      title: '赛事记分工具 API',
      version: '1.0.0',
      description:
        '赛事记分工具当前项目的 HTTP API 文档。大部分接口使用统一响应结构 `code / message / data`，受保护接口通过 `game_score_session` Cookie 鉴权。',
    },
    servers: serverUrl
      ? [
          {
            url: serverUrl,
            description: 'Current server',
          },
        ]
      : [],
    tags: [
      {
        name: 'Auth',
        description: '注册、登录、退出登录',
      },
      {
        name: 'Rooms',
        description: '房间列表、详情、加入、结束、扑克轮次操作',
      },
      {
        name: 'Scores',
        description: '房间内加分操作',
      },
      {
        name: 'Users',
        description: '用户参与历史',
      },
    ],
    paths: {
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: '注册账号',
          requestBody: {
            required: true,
            content: jsonContent(ref('RegisterRequest')),
          },
          responses: {
            '200': success(ref('AuthPayload'), '注册成功'),
            '400': error(400, '邮箱、密码和昵称不能为空'),
            '500': error(500, '注册失败，请重试'),
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: '登录',
          requestBody: {
            required: true,
            content: jsonContent(ref('LoginRequest')),
          },
          responses: {
            '200': success(ref('AuthPayload'), '登录成功'),
            '400': error(400, '邮箱和密码不能为空'),
            '500': error(500, '登录失败，请重试'),
          },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: '退出登录',
          responses: {
            '200': success(ref('SimpleSuccessPayload'), '退出成功'),
          },
        },
      },
      '/api/rooms': {
        get: {
          tags: ['Rooms'],
          summary: '获取进行中的房间列表',
          security: authSecurity,
          responses: {
            '200': success(arrayOf(ref('Room')), '获取房间列表成功'),
            '401': error(401, '登录已失效，请重新登录'),
            '500': error(500, '获取房间列表失败'),
          },
        },
        post: {
          tags: ['Rooms'],
          summary: '创建房间',
          security: authSecurity,
          requestBody: {
            required: true,
            content: jsonContent(ref('CreateRoomRequest')),
          },
          responses: {
            '200': success(ref('CreateRoomPayload'), '创建房间成功'),
            '400': error(400, '房间名称和密码不能为空'),
            '401': error(401, '登录已失效，请重新登录'),
            '500': error(500, '创建房间失败'),
          },
        },
      },
      '/api/rooms/{id}': {
        get: {
          tags: ['Rooms'],
          summary: '获取房间详情',
          security: authSecurity,
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: '房间 ID',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': success(ref('RoomDetailsResponse'), '获取房间成功'),
            '401': error(401, '登录已失效，请重新登录'),
            '403': error(403, '你还不是该房间成员'),
            '404': error(404, '房间不存在'),
            '500': error(500, '获取房间失败'),
          },
        },
      },
      '/api/rooms/{id}/join': {
        post: {
          tags: ['Rooms'],
          summary: '加入房间',
          security: authSecurity,
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: '房间 ID',
              schema: {
                type: 'string',
              },
            },
          ],
          requestBody: {
            required: true,
            content: jsonContent(ref('JoinRoomRequest')),
          },
          responses: {
            '200': success(ref('JoinedPayload'), '加入房间成功'),
            '400': error(400, '密码不能为空'),
            '401': error(401, '登录已失效，请重新登录'),
            '404': error(404, '房间不存在'),
            '500': error(500, '加入房间失败'),
          },
        },
      },
      '/api/rooms/{id}/finish': {
        post: {
          tags: ['Rooms'],
          summary: '结束房间',
          security: authSecurity,
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: '房间 ID',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': success(ref('SimpleSuccessPayload'), '结束房间成功'),
            '401': error(401, '登录已失效，请重新登录'),
            '403': error(403, '你无权结束该房间'),
            '404': error(404, '房间不存在'),
            '500': error(500, '结束房间失败'),
          },
        },
      },
      '/api/rooms/{id}/rounds': {
        post: {
          tags: ['Rooms'],
          summary: '开始一轮发牌',
          security: authSecurity,
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: '房间 ID',
              schema: {
                type: 'string',
              },
            },
          ],
          requestBody: {
            required: true,
            content: jsonContent(ref('DealRoundRequest')),
          },
          responses: {
            '200': success(ref('DealRoundPayload'), '发牌成功'),
            '400': error(400, '请提供本轮发牌配置'),
            '401': error(401, '登录已失效，请重新登录'),
            '403': error(403, '只有房主可以发牌'),
            '404': error(404, '房间不存在'),
            '500': error(500, '发牌失败，请重试'),
          },
        },
      },
      '/api/rooms/{id}/rounds/draw': {
        post: {
          tags: ['Rooms'],
          summary: '当前轮次抽一张牌',
          security: authSecurity,
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: '房间 ID',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': success(ref('DrawCardPayload'), '抽牌成功'),
            '400': error(400, '当前还没有开始发牌'),
            '401': error(401, '登录已失效，请重新登录'),
            '403': error(403, '你还不是该房间成员'),
            '404': error(404, '房间不存在'),
            '500': error(500, '抽牌失败，请重试'),
          },
        },
      },
      '/api/rooms/{id}/rounds/cards/toggle': {
        post: {
          tags: ['Rooms'],
          summary: '翻转自己当前轮的某张手牌',
          security: authSecurity,
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: '房间 ID',
              schema: {
                type: 'string',
              },
            },
          ],
          requestBody: {
            required: true,
            content: jsonContent(ref('ToggleCardRequest')),
          },
          responses: {
            '200': success(ref('ToggleCardPayload'), '翻牌成功'),
            '400': error(400, '缺少要翻面的牌'),
            '401': error(401, '登录已失效，请重新登录'),
            '403': error(403, '你还不是该房间成员'),
            '404': error(404, '房间不存在'),
            '500': error(500, '翻牌失败，请重试'),
          },
        },
      },
      '/api/scores': {
        post: {
          tags: ['Scores'],
          summary: '给房间成员加分',
          security: authSecurity,
          requestBody: {
            required: true,
            content: jsonContent(ref('AddScoreRequest')),
          },
          responses: {
            '200': success(ref('AddScorePayload'), '添加分数成功'),
            '400': error(400, '缺少必要参数'),
            '401': error(401, '登录已失效，请重新登录'),
            '403': error(403, '只能给房间内成员打分'),
            '404': error(404, '房间不存在'),
            '500': error(500, '添加分数失败'),
          },
        },
      },
      '/api/users/{id}/history': {
        get: {
          tags: ['Users'],
          summary: '获取当前用户参与历史',
          security: authSecurity,
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: '用户 ID',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': success(arrayOf(ref('ParticipationHistory')), '获取参与历史成功'),
            '401': error(401, '登录已失效，请重新登录'),
            '403': error(403, '无权查看其他用户的参与历史'),
            '500': error(500, '获取参与历史失败'),
          },
        },
      },
    },
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'game_score_session',
          description: '登录成功后服务端写入的会话 Cookie。',
        },
      },
      schemas: {
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'player@example.com',
            },
            password: {
              type: 'string',
              minLength: 6,
              example: 'secret123',
            },
            name: {
              type: 'string',
              example: 'Zorro',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'player@example.com',
            },
            password: {
              type: 'string',
              example: 'secret123',
            },
          },
        },
        CreateRoomRequest: {
          type: 'object',
          required: ['name', 'password'],
          properties: {
            name: {
              type: 'string',
              example: '周末德州局',
            },
            password: {
              type: 'string',
              example: '888888',
            },
            gameType: {
              type: 'string',
              enum: ['classic', 'poker_rounds'],
              example: 'classic',
            },
          },
        },
        JoinRoomRequest: {
          type: 'object',
          required: ['password'],
          properties: {
            password: {
              type: 'string',
              example: '888888',
            },
          },
        },
        AddScoreRequest: {
          type: 'object',
          required: ['roomId', 'toUserId', 'points'],
          properties: {
            roomId: {
              type: 'string',
              example: 'room_123',
            },
            toUserId: {
              type: 'string',
              example: 'user_456',
            },
            points: {
              type: 'number',
              example: 5,
            },
          },
        },
        DealRoundRequest: {
          type: 'object',
          required: ['allocations'],
          properties: {
            allocations: arrayOf(ref('DealAllocation')),
          },
        },
        ToggleCardRequest: {
          type: 'object',
          required: ['cardCode'],
          properties: {
            cardCode: {
              type: 'string',
              example: 'AS',
            },
          },
        },
        User: {
          type: 'object',
          required: ['id', 'email', 'name', 'avatar'],
          properties: {
            id: {
              type: 'string',
              example: 'user_123',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'player@example.com',
            },
            name: {
              type: 'string',
              example: 'Zorro',
            },
            avatar: {
              type: 'string',
              format: 'uri',
              example: 'https://api.dicebear.com/9.x/identicon/svg?seed=player%40example.com',
            },
          },
        },
        Room: {
          type: 'object',
          required: [
            'id',
            'name',
            'password',
            'status',
            'roomNumber',
            'creatorId',
            'creatorName',
            'gameType',
            'createdAt',
            'lastActivityAt',
            'currentRoundNumber',
            'users',
          ],
          properties: {
            id: {
              type: 'string',
              example: 'room_123',
            },
            name: {
              type: 'string',
              example: '周末德州局',
            },
            password: {
              type: 'string',
              example: '888888',
            },
            status: {
              type: 'string',
              enum: ['active', 'finished'],
              example: 'active',
            },
            roomNumber: {
              type: 'integer',
              example: 12,
            },
            creatorId: {
              type: 'string',
              example: 'user_123',
            },
            creatorName: {
              type: 'string',
              example: 'Zorro',
            },
            gameType: {
              type: 'string',
              enum: ['classic', 'poker_rounds'],
              example: 'poker_rounds',
            },
            createdAt: {
              type: 'integer',
              format: 'int64',
              example: 1742179200000,
            },
            lastActivityAt: {
              type: 'integer',
              format: 'int64',
              example: 1742179800000,
            },
            currentRoundNumber: {
              type: 'integer',
              nullable: true,
              example: 2,
            },
            users: arrayOf({
              type: 'string',
              example: 'user_123',
            }),
          },
        },
        Score: {
          type: 'object',
          required: ['id', 'roomId', 'fromUserId', 'toUserId', 'points', 'timestamp'],
          properties: {
            id: {
              type: 'string',
              example: 'score_123',
            },
            roomId: {
              type: 'string',
              example: 'room_123',
            },
            fromUserId: {
              type: 'string',
              example: 'user_123',
            },
            toUserId: {
              type: 'string',
              example: 'user_456',
            },
            points: {
              type: 'number',
              example: 5,
            },
            timestamp: {
              type: 'integer',
              format: 'int64',
              example: 1742179800000,
            },
          },
        },
        ScoreRecord: {
          type: 'object',
          required: [
            'id',
            'fromUserId',
            'fromName',
            'fromAvatar',
            'toUserId',
            'toName',
            'toAvatar',
            'points',
            'timestamp',
          ],
          properties: {
            id: {
              type: 'string',
              example: 'score_123',
            },
            fromUserId: {
              type: 'string',
              example: 'user_123',
            },
            fromName: {
              type: 'string',
              example: 'Zorro',
            },
            fromAvatar: {
              type: 'string',
              format: 'uri',
              example: 'https://api.dicebear.com/9.x/identicon/svg?seed=player1',
            },
            toUserId: {
              type: 'string',
              example: 'user_456',
            },
            toName: {
              type: 'string',
              example: 'Alice',
            },
            toAvatar: {
              type: 'string',
              format: 'uri',
              example: 'https://api.dicebear.com/9.x/identicon/svg?seed=player2',
            },
            points: {
              type: 'number',
              example: 5,
            },
            timestamp: {
              type: 'integer',
              format: 'int64',
              example: 1742179800000,
            },
          },
        },
        PlayingCard: {
          type: 'object',
          required: ['code', 'rank', 'suit', 'label', 'color', 'isFaceUp'],
          properties: {
            code: {
              type: 'string',
              example: 'AS',
            },
            rank: {
              type: 'string',
              example: 'A',
            },
            suit: {
              type: 'string',
              enum: ['spades', 'hearts', 'clubs', 'diamonds', 'joker'],
              example: 'spades',
            },
            label: {
              type: 'string',
              example: 'A♠',
            },
            color: {
              type: 'string',
              enum: ['red', 'black', 'special'],
              example: 'black',
            },
            isFaceUp: {
              type: 'boolean',
              example: true,
            },
          },
        },
        RoundHand: {
          type: 'object',
          required: ['userId', 'visibleCards', 'hiddenCount', 'isParticipant'],
          properties: {
            userId: {
              type: 'string',
              example: 'user_123',
            },
            visibleCards: arrayOf(ref('PlayingCard')),
            hiddenCount: {
              type: 'integer',
              example: 2,
            },
            isParticipant: {
              type: 'boolean',
              example: true,
            },
          },
        },
        CurrentRound: {
          type: 'object',
          required: ['roundNumber', 'dealtAt', 'remainingCardCount', 'hands'],
          properties: {
            roundNumber: {
              type: 'integer',
              example: 2,
            },
            dealtAt: {
              type: 'integer',
              format: 'int64',
              example: 1742179800000,
            },
            remainingCardCount: {
              type: 'integer',
              example: 37,
            },
            hands: arrayOf(ref('RoundHand')),
          },
        },
        DealAllocation: {
          type: 'object',
          required: ['userId', 'cardCount'],
          properties: {
            userId: {
              type: 'string',
              example: 'user_123',
            },
            cardCount: {
              type: 'integer',
              minimum: 0,
              example: 2,
            },
          },
        },
        ParticipationHistory: {
          type: 'object',
          required: [
            'roomId',
            'roomName',
            'roomNumber',
            'roomStatus',
            'creatorName',
            'gameType',
            'joinedAt',
            'participantCount',
            'scoresGiven',
            'scoresReceived',
            'totalPointsGiven',
            'totalPointsReceived',
            'finalScore',
          ],
          properties: {
            roomId: {
              type: 'string',
              example: 'room_123',
            },
            roomName: {
              type: 'string',
              example: '周末德州局',
            },
            roomNumber: {
              type: 'integer',
              example: 12,
            },
            roomStatus: {
              type: 'string',
              enum: ['active', 'finished'],
              example: 'finished',
            },
            creatorName: {
              type: 'string',
              example: 'Zorro',
            },
            gameType: {
              type: 'string',
              enum: ['classic', 'poker_rounds'],
              example: 'classic',
            },
            joinedAt: {
              type: 'integer',
              format: 'int64',
              example: 1742179200000,
            },
            participantCount: {
              type: 'integer',
              example: 4,
            },
            scoresGiven: {
              type: 'integer',
              example: 5,
            },
            scoresReceived: {
              type: 'integer',
              example: 3,
            },
            totalPointsGiven: {
              type: 'number',
              example: 15,
            },
            totalPointsReceived: {
              type: 'number',
              example: 8,
            },
            finalScore: {
              type: 'number',
              example: -7,
            },
          },
        },
        RoomDetailsResponse: {
          type: 'object',
          required: ['room', 'users', 'scores', 'records', 'currentRound'],
          properties: {
            room: ref('Room'),
            users: arrayOf(ref('User')),
            scores: {
              type: 'object',
              additionalProperties: {
                type: 'number',
              },
              example: {
                user_123: 10,
                user_456: -10,
              },
            },
            records: arrayOf(ref('ScoreRecord')),
            currentRound: {
              allOf: [ref('CurrentRound')],
              nullable: true,
            },
          },
        },
        AuthPayload: {
          type: 'object',
          required: ['user'],
          properties: {
            user: ref('User'),
          },
        },
        CreateRoomPayload: {
          type: 'object',
          required: ['room'],
          properties: {
            room: ref('Room'),
          },
        },
        JoinedPayload: {
          type: 'object',
          required: ['joined'],
          properties: {
            joined: {
              type: 'boolean',
              example: true,
            },
          },
        },
        SimpleSuccessPayload: {
          type: 'object',
          required: ['success'],
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
          },
        },
        DealRoundPayload: {
          type: 'object',
          required: ['success', 'roundNumber', 'remainingCardCount'],
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            roundNumber: {
              type: 'integer',
              example: 2,
            },
            remainingCardCount: {
              type: 'integer',
              example: 37,
            },
          },
        },
        DrawCardPayload: {
          type: 'object',
          required: ['success', 'drawId', 'roundNumber'],
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            drawId: {
              type: 'string',
              example: '8be7fe48-bd55-4d48-a8a8-2d6312d35d66',
            },
            roundNumber: {
              type: 'integer',
              example: 2,
            },
          },
        },
        ToggleCardPayload: {
          type: 'object',
          required: ['success', 'isFaceUp'],
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            isFaceUp: {
              type: 'boolean',
              example: false,
            },
          },
        },
        AddScorePayload: {
          type: 'object',
          required: ['score'],
          properties: {
            score: ref('Score'),
          },
        },
      },
    },
  };
}
