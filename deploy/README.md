# 生产部署指南

本项目当前采用 `GitHub + GitHub Actions + VPS + PM2 + Nginx + SQLite` 的部署方案。

部署职责划分如下：

- GitHub: 唯一主仓库、Pull Request、CI、手动发布入口
- GitHub Actions: 自动测试、构建检查、手动生产发布
- VPS: 运行业务进程、保存 SQLite 数据、执行 PM2 管理
- Nginx: 反向代理与 HTTPS

## 1. 服务器要求

推荐配置：

- CPU: 1 核
- 内存: 2 GB
- 硬盘: 40 GB SSD
- 系统: Ubuntu 20.04/22.04 LTS

## 2. 服务器初始化

以 root 用户执行：

```bash
chmod +x deploy/setup-server.sh
sudo ./deploy/setup-server.sh
```

脚本会安装：

- Node.js 20
- PM2
- Nginx
- Git
- Certbot

## 3. 从 GitHub 克隆代码

切换到部署用户：

```bash
su - deploy
cd /home/deploy
git clone git@github.com:zo11o/game-score.git
cd game-score
```

如果使用 HTTPS：

```bash
git clone https://github.com/zo11o/game-score.git
```

## 4. 配置生产环境

复制生产配置模板：

```bash
cp .env.production.example .env
mkdir -p prisma/data
```

默认示例见 [`../.env.production.example`](../.env.production.example)：

```env
DATABASE_URL="file:./data/prod.db"
NODE_ENV=production
HOSTNAME=0.0.0.0
PORT=3000
```

由于 `.env` 位于项目根目录，这里的 SQLite 文件最终会落在：

```text
prisma/data/prod.db
```

## 5. 首次启动

```bash
npm ci
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
```

[`../server.js`](../server.js) 会在启动时自动执行 `prisma generate` 和 `prisma migrate deploy`。

## 6. GitHub Actions 发布流程

仓库中的 [`../.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) 会在手动触发后：

1. 校验当前 workflow 来源分支为 `master`
2. 通过 `production` environment 读取部署密钥
3. 使用 SSH 登录 VPS
4. 在服务器上执行：

```bash
cd /home/deploy/game-score
DEPLOY_REMOTE=origin DEPLOY_BRANCH=master DEPLOY_REF=<github-sha> bash ./deploy/deploy.sh
```

部署脚本会完成：

- 拉取指定分支或指定提交
- 备份 SQLite 数据库
- 安装依赖
- 构建应用
- 重启或启动 PM2 服务

## 7. GitHub 仓库配置

在 GitHub 仓库中完成以下设置：

### Branch protection

- 保护 `master`
- 要求 Pull Request 合并
- 要求 CI 通过后才能合并

### Environment

创建 `production` environment，并配置 secrets：

- `VPS_HOST`
- `VPS_PORT`
- `VPS_USER`
- `VPS_SSH_KEY`

可以按需为 `production` 增加 Required reviewers，这样每次点发布都需要审批。

## 8. Nginx 与 HTTPS

复制示例配置：

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/game-score
sudo ln -s /etc/nginx/sites-available/game-score /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

然后申请 HTTPS 证书：

```bash
sudo certbot --nginx -d your-domain.com
```

## 9. 日常运维

常用命令：

```bash
pm2 status game-score
pm2 logs game-score
pm2 restart game-score
pm2 monit
```

数据库备份：

```bash
./deploy/backup.sh
```

数据库回滚：

```bash
./deploy/rollback.sh
```

## 10. 故障排查

- Actions 无法连接服务器时，先确认 `VPS_HOST`、`VPS_PORT`、`VPS_USER`、`VPS_SSH_KEY`
- 服务器拉取代码失败时，确认 `/home/deploy/game-score` 的 `origin` 指向 GitHub 且具备读取权限
- 站点打不开时，先检查 `pm2 status game-score` 和 `pm2 logs game-score`
- WebSocket 异常时，确认 Nginx 配置中保留了 `Upgrade` 和 `Connection` 头
