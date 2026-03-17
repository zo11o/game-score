# GitHub 单仓库初始化

本项目现在约定 GitHub 为唯一远端，CI/CD、发布记录和生产部署都集中在 GitHub。

## 1. 创建 GitHub 仓库

在 GitHub 创建一个新的空仓库，例如 `zo11o/game-score`，不要勾选自动生成 README、`.gitignore` 或 License。

## 2. 切换本地远端

如果当前 `origin` 还指向旧仓库，切换到新的 GitHub 仓库：

```bash
git remote set-url origin git@github.com:zo11o/game-score.git
git remote -v
git push -u origin master
```

如果你更偏好 HTTPS，也可以使用：

```bash
git remote set-url origin https://github.com/zo11o/game-score.git
git push -u origin master
```

## 3. GitHub 仓库设置

建议在 GitHub 仓库里完成以下配置：

1. 打开 `Settings -> Branches`，为 `master` 配置保护规则
2. 要求 Pull Request 合并
3. 要求状态检查通过后才能合并
4. 将 `CI / Test and Build` 设为必需检查

## 4. 配置 Production Environment

在 `Settings -> Environments` 中创建 `production` environment，并按需开启 Required reviewers。

需要的 secrets：

- `VPS_HOST`: 生产服务器地址
- `VPS_PORT`: SSH 端口，通常为 `22`
- `VPS_USER`: 部署用户，例如 `deploy`
- `VPS_SSH_KEY`: 对应部署用户的私钥内容

## 5. 服务器初始化

先参考 [`deploy/README.md`](../deploy/README.md) 初始化服务器，再确保服务器上的代码目录满足以下约定：

```bash
/home/deploy/game-score
```

服务端仓库应直接从 GitHub clone，并让 `origin` 指向 GitHub：

```bash
cd /home/deploy
git clone git@github.com:zo11o/game-score.git
cd game-score
cp .env.production.example .env
mkdir -p prisma/data
npm ci
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
```

## 6. 首次验证

1. 向 `master` 推送一次提交，确认 CI 自动运行
2. 在 GitHub Actions 中手动触发 `Deploy Production`
3. 到 GitHub 的 `production` environment 查看部署记录
4. 在服务器上执行 `pm2 status game-score` 检查服务状态
