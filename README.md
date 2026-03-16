# 赛事记分工具

面向 C 端用户的赛事记分工具，采用科技感 Retro-Futurism 设计风格。

## 功能特性

### 核心功能
- ✅ 用户注册/登录系统
- ✅ 游戏大厅（房间列表）
- ✅ 创建房间（密码保护）
- ✅ 加入房间
- ✅ 房间内互相给分
- ✅ 实时分数显示（WebSocket 同步，多人操作即时更新）
- ✅ 用户中心
- ✅ 数据持久化（SQLite 数据库）

### 设计特点
- 🎨 Retro-Futurism 科技感风格
- 🌈 霓虹紫粉配色方案
- ✨ CRT 扫描线效果
- 🔤 Orbitron + Exo 2 字体组合
- 📱 响应式设计

## 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS 4
- **测试**: Vitest + Testing Library
- **数据**: Prisma + SQLite (数据库持久化)

## 快速开始

### 安装依赖

```bash
npm install
```

### 数据库配置

项目使用 SQLite 存储数据。首次运行前：

1. 创建 `.env` 文件，添加：
   ```
   DATABASE_URL="file:./dev.db"
   ```
2. 启动应用时会自动执行数据库迁移；如需手动执行，也可以运行：
   ```bash
   npx prisma migrate deploy
   ```

注意：Prisma Schema 位于 `prisma/schema.prisma`，所以这里的 SQLite 相对路径最终对应的实际文件是 `prisma/dev.db`。

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000

> **注意**：实时同步依赖 WebSocket，必须使用 `npm run dev` 启动（会运行自定义服务器）。若使用 `npx next dev` 直接启动，则无法实时同步。

### 运行测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 测试覆盖率
npm run test:coverage
```

### 构建生产版本

```bash
npm run build
npm start
```

## 使用流程

### 1. 注册/登录
- 首次使用：点击"去注册"，输入邮箱、密码和昵称创建账号
- 再次使用：输入邮箱和密码登录

### 2. 游戏大厅
- 查看所有房间列表
- 点击"创建房间"按钮创建新房间
- 点击房间卡片加入已有房间

### 3. 房间内
- 查看所有用户头像和当前分数
- 点击其他用户头像给分
- 输入分数（1-100）并确认

### 4. 用户中心
- 查看个人信息
- 退出登录

## 测试覆盖

### 单元测试
- ✅ 类型定义（3 个测试）
- ✅ 登录页面功能（8 个测试）
- ✅ 游戏大厅功能（9 个测试）
- ✅ 房间页面功能（10 个测试）

**总计**: 30 个测试用例，100% 通过

### 测试内容
- 用户管理（增删改查）
- 房间管理（创建、加入）
- 分数管理（给分、计算）
- 数据持久化
- UI 交互流程
- 表单验证
- 错误处理

## 项目结构

```
game-score/
├── app/
│   ├── api/                  # API 路由
│   │   ├── auth/             # 注册、登录
│   │   ├── rooms/            # 房间 CRUD、加入
│   │   └── scores/           # 分数记录
│   ├── login/
│   │   └── page.tsx          # 登录/注册页面
│   ├── profile/
│   │   └── page.tsx          # 用户中心
│   ├── room/
│   │   └── [id]/
│   │       └── page.tsx      # 房间详情页
│   ├── page.tsx              # 游戏大厅
│   ├── layout.tsx            # 根布局
│   └── globals.css           # 全局样式
├── lib/
│   ├── api.ts                # 客户端 API 调用
│   ├── auth.ts               # 服务端密码哈希
│   ├── prisma.ts             # Prisma 客户端
│   ├── types.ts              # 类型定义
│   └── db.ts                 # 类型导出（兼容）
├── prisma/
│   ├── schema.prisma         # 数据库模型
│   └── migrations/           # 迁移文件
├── __tests__/
│   ├── lib/
│   │   └── db.test.ts        # 类型测试
│   └── app/
│       ├── login.test.tsx    # 登录测试
│       ├── home.test.tsx     # 大厅测试
│       └── room.test.tsx     # 房间测试
├── vitest.config.ts          # 测试配置
└── vitest.setup.ts           # 测试环境设置
```

## 数据模型

### User (用户)
```typescript
{
  id: string;
  email: string;
  name: string;
  avatar: string;
}
```

### Room (房间)
```typescript
{
  id: string;
  name: string;
  password: string;
  createdAt: number;
  users: string[];
}
```

### Score (分数记录)
```typescript
{
  id: string;
  roomId: string;
  fromUserId: string;
  toUserId: string;
  points: number;
  timestamp: number;
}
```

## 设计系统

### 配色方案
- Primary: `#2563EB` (蓝色)
- Secondary: `#3B82F6` (浅蓝)
- CTA: `#F97316` (橙色)
- Neon Purple: `#A855F7`
- Neon Pink: `#EC4899`
- Background: `#0a0a0a` (深黑)

### 字体
- 标题: Orbitron (科技感)
- 正文: Exo 2 (未来感)

### 特效
- 霓虹发光 (text-shadow)
- CRT 扫描线 (repeating-linear-gradient)
- 玻璃态背景 (backdrop-blur)
- 渐变边框 (border-gradient)

## 浏览器兼容性

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## 注意事项

- 数据存储在浏览器 localStorage，清除浏览器数据会丢失所有记录
- 不同浏览器的数据不互通
- 建议使用现代浏览器以获得最佳体验

## License

MIT
