# AGENTS.md

本文件面向后续在本仓库内工作的编码代理、自动化协作者与新接手的开发者，用来快速建立统一上下文。

## 1. 项目定位

这是一个面向 C 端的赛事记分工具，当前 `master` 已完成 `MVP v0.1`。

核心能力：

- 用户注册、登录、退出
- 大厅查看房间、搜索房间、创建房间、加入房间
- 经典记分房间
- 扑克轮次房间
- 扑克轮次中的发牌、抽牌、看牌、亮牌/盖牌、顺序规则
- 用户中心与参与历史
- WebSocket 实时同步
- SQLite + Prisma 数据持久化
- OpenAPI / Swagger 文档

当前 UI 主风格：

- HeroUI + Tailwind CSS 4
- 浅色主题
- 淡雅绿白系
- 顶部导航统一为共享 `PageHeader`

## 2. 启动与验证

常用命令：

```bash
npm install
npm run dev
npm run build
npm start
npm test
npm run test:watch
npx eslint .
```

重要约束：

- 必须使用 `npm run dev` 或 `npm start`
- 不要直接用 `next dev` / `next start`
- 原因：项目依赖自定义 `server.js` 挂载 Socket.IO

数据库：

```bash
npx prisma generate
npx prisma migrate deploy
```

默认数据库文件最终落在：

- `prisma/dev.db`

## 3. 核心架构

### 3.1 自定义服务

- 入口：`server.js`
- Next.js 与 Socket.IO 共用同一端口
- 服务启动时会自动做 Prisma 初始化和迁移

### 3.2 鉴权方式

- 服务端使用 Cookie Session
- 不是 JWT
- 关键文件：`lib/session.ts`

### 3.3 实时同步

- API 写操作后通过 `lib/room-events.ts` 广播
- 客户端通过 `lib/use-room-socket.ts` 监听
- 房间详情页收到更新后会重新拉取房间状态

### 3.4 数据模型

关键模型位于 `prisma/schema.prisma`：

- `User`
- `Room`
- `RoomMember`
- `Session`
- `Score`
- `RoomRound`
- `RoomRoundCard`

## 4. 关键目录

```text
app/
  page.tsx                 大厅
  login/page.tsx           登录/注册
  profile/page.tsx         用户中心
  room/[id]/page.tsx       房间详情
  api/                     API 路由
  docs/                    Swagger UI

components/
  page-header.tsx          页面统一导航头
  auth-modal.tsx           登录/注册弹窗

lib/
  api.ts                   客户端 API
  session.ts               Session 鉴权
  room-response.ts         房间详情聚合响应
  cards.ts                 扑克牌逻辑
  round-order.ts           轮次顺序规则
  use-room-socket.ts       房间实时同步

__tests__/
  app/
  lib/
```

## 5. 当前约定

### 5.1 UI 约定

- 新页面优先复用 `components/page-header.tsx`
- 标题、返回上一页、回首页图标尽量与现有页面一致
- 新增表单控件优先使用 HeroUI
- `Select`、`Modal`、`Input` 不要再退回原生实现，除非有明确理由
- 当前主题为浅绿白，不要重新引入大面积紫粉主视觉

### 5.2 API 约定

- 统一响应 envelope，见 `lib/api-response.ts`
- 新的保护路由必须先做 session 校验
- 写操作后如果影响房间视图，要补对应广播

### 5.3 房间页约定

- `app/room/[id]/page.tsx` 是复杂页，改动前先定位影响范围
- 发牌动画只应在“真正进入下一轮”时触发
- 首次刷新进入已有轮次时，不应重播发牌动画
- 卡牌文案当前统一为“`双击卡牌可亮牌或盖牌`”

### 5.4 测试约定

- UI 变更后至少回归：
  - `__tests__/app/home.test.tsx`
  - `__tests__/app/login.test.tsx`
  - `__tests__/app/room.test.tsx`
- 如果改了轮次、发牌、抽牌、顺序规则，优先补 `room.test.tsx`

## 6. 常见坑

- WebSocket 依赖自定义 server，启动方式错了会误判功能坏掉
- HeroUI `Select` 测试时会同时存在隐藏原生 `select` 和可视触发器
- 房间页很多状态由 `fetchRoom + socket + 本地动画队列` 共同驱动
- 不要把“首次加载已有轮次”误判成“新一轮开始”
- 部分 lint 告警是历史遗留，处理时先区分“本次新增问题”和“已有问题”

## 7. 推荐工作流

1. 先读受影响页面与对应测试
2. 再看是否波及 `lib/` 中的共享逻辑
3. 实现后先跑最小相关测试
4. 再补局部 lint / 类型检查
5. 若改动影响用户流程，更新文档或测试说明

## 8. 交付前检查

提交前至少确认：

- 页面主流程可跑通
- 相关测试通过
- 没有误改房间动画或顺序规则
- 没有重新引入大面积深色紫粉主题
- 新增交互文案与当前产品语气一致

