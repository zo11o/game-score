# 赛事记分工具

面向 C 端用户的赛事记分工具，当前仓库已完成 `MVP v0.1`，支持用户登录、房间大厅、经典记分、扑克轮次房间、用户中心，以及基于 Socket.IO 的房间实时同步。

## 技术栈

- Next.js 16 App Router
- React 19
- HeroUI + Tailwind CSS 4
- Prisma + SQLite
- Socket.IO
- Vitest + Testing Library

## 本地开发

### 安装依赖

```bash
npm install
```

### 环境变量

创建 `.env` 文件：

```env
DATABASE_URL="file:./dev.db"
```

由于 Prisma schema 位于 `prisma/schema.prisma`，上面的相对路径最终对应数据库文件 `prisma/dev.db`。

### 启动开发服务

```bash
npm run dev
```

请不要直接运行 `next dev`。项目依赖自定义 `server.js` 挂载 Socket.IO，只有 `npm run dev` 和 `npm start` 会走正确的启动路径。

开发环境启动时会自动执行：

- `prisma generate`
- `prisma migrate deploy`

访问入口：

- 应用首页: [http://localhost:3000](http://localhost:3000)
- Swagger UI: [http://localhost:3000/docs](http://localhost:3000/docs)
- OpenAPI JSON: [http://localhost:3000/api/openapi](http://localhost:3000/api/openapi)

## 测试与构建

```bash
npm test
npm run build
```

常用命令：

```bash
npm run test:watch
npm run test:coverage
npx eslint .
```

根据仓库约定，涉及 UI 变更时至少回归：

- `__tests__/app/home.test.tsx`
- `__tests__/app/login.test.tsx`
- `__tests__/app/room.test.tsx`

## 生产部署架构

生产部署维持当前架构，不改业务运行模式：

- GitHub 作为唯一代码仓库
- GitHub Actions 负责 CI 和手动生产发布
- VPS 运行 Node.js + PM2 + Nginx
- SQLite 数据库存放在服务器本地 `prisma/data/prod.db`

服务进程继续使用 `ecosystem.config.js`，部署脚本位于 `deploy/deploy.sh`。

更详细的部署说明见：

- [部署说明](deploy/README.md)
- [GitHub 初始化说明](docs/github-setup.md)

## GitHub Actions

仓库新增了两条工作流：

- `.github/workflows/ci.yml`
  - 在 `pull_request` 和 `push` 到 `master` 时自动运行
  - 执行 `npm ci`、`npx prisma generate`、`npm test`、`npm run build`
- `.github/workflows/deploy.yml`
  - 通过 `workflow_dispatch` 手动触发
  - 仅允许从 `master` 发布
  - 通过 SSH 登录 VPS 并执行服务器上的部署脚本
  - 与 GitHub `production` environment 结合使用，保留部署审计记录

## 关键目录

```text
app/                     页面与 API 路由
components/              共享 UI 组件
lib/                     鉴权、房间聚合、Socket 等共享逻辑
prisma/                  Prisma schema 与 SQLite 数据文件
deploy/                  服务器部署、备份、回滚脚本
.github/workflows/       GitHub Actions 工作流
__tests__/               应用与共享逻辑测试
```

## 运行约定

- 默认开发分支为 `master`
- 业务写操作如果影响房间详情，需要补对应广播
- 房间页动画不要把“首次加载已有轮次”误判成“进入新一轮”
- 生产环境统一从 GitHub 仓库拉取代码，不再维护第二主仓库

## 故障排查

- WebSocket 不工作时，先确认是否通过 `npm run dev` 或 `npm start` 启动
- Prisma 报错时，先检查 `.env` 中的 `DATABASE_URL`
- 生产部署失败时，先查看 GitHub Actions 日志，再在服务器上检查 `pm2 logs game-score`

## License

MIT
