#!/bin/bash
#
# Game Score 应用部署脚本
#
# 使用方法：
#   ./deploy.sh [--skip-backup] [--skip-build]
#
# 环境变量：
#   DEPLOY_REMOTE  代码远端，默认 origin
#   DEPLOY_BRANCH  部署分支，默认 master
#   DEPLOY_REF     可选，指定要部署的 Git commit SHA
#
# 选项：
#   --skip-backup  跳过数据库备份
#   --skip-build   跳过构建步骤（仅代码更新时使用）
#

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
APP_DIR="/home/deploy/game-score"
DB_PATH="prisma/data/prod.db"
BACKUP_DIR="/home/deploy/backups"
APP_NAME="game-score"
DEPLOY_REMOTE="${DEPLOY_REMOTE:-origin}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-master}"
DEPLOY_REF="${DEPLOY_REF:-}"

# 解析参数
SKIP_BACKUP=false
SKIP_BUILD=false

for arg in "$@"; do
  case $arg in
    --skip-backup)
      SKIP_BACKUP=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
  esac
done

cd "$APP_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Game Score 部署脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. 拉取最新代码
echo -e "${YELLOW}>>> [1/6] 拉取最新代码${NC}"
git fetch "$DEPLOY_REMOTE" "$DEPLOY_BRANCH"
BEFORE_COMMIT=$(git rev-parse HEAD)

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "$DEPLOY_BRANCH" ]; then
  git checkout "$DEPLOY_BRANCH"
fi

if [ -n "$DEPLOY_REF" ]; then
  if ! git merge-base --is-ancestor "$DEPLOY_REF" FETCH_HEAD; then
    echo -e "${RED}    错误: DEPLOY_REF 不属于 ${DEPLOY_REMOTE}/${DEPLOY_BRANCH}${NC}"
    exit 1
  fi

  git merge --ff-only "$DEPLOY_REF"
else
  git merge --ff-only FETCH_HEAD
fi

AFTER_COMMIT=$(git rev-parse HEAD)

if [ "$BEFORE_COMMIT" = "$AFTER_COMMIT" ]; then
  echo -e "${GREEN}    代码已是最新${NC}"
else
  echo -e "${GREEN}    代码已更新: $BEFORE_COMMIT -> $AFTER_COMMIT${NC}"
fi
echo ""

# 2. 备份数据库
if [ "$SKIP_BACKUP" = false ]; then
  echo -e "${YELLOW}>>> [2/6] 备份数据库${NC}"
  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/prod-$(date +%Y%m%d%H%M%S).db"

  if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "$BACKUP_FILE"
    echo -e "${GREEN}    数据库已备份: $BACKUP_FILE${NC}"

    # 清理旧备份（保留最近 30 天）
    find "$BACKUP_DIR" -name "prod-*.db" -type f -mtime +30 -delete 2>/dev/null || true
    echo -e "${GREEN}    已清理 30 天前的旧备份${NC}"
  else
    echo -e "${YELLOW}    数据库文件不存在，跳过备份${NC}"
  fi
else
  echo -e "${YELLOW}>>> [2/6] 跳过数据库备份 (--skip-backup)${NC}"
fi
echo ""

# 3. 安装依赖
echo -e "${YELLOW}>>> [3/6] 检查并安装依赖${NC}"
if [ -f "package-lock.json" ]; then
  npm ci
else
  npm install
fi
echo -e "${GREEN}    依赖安装完成${NC}"
echo ""

# 4. 构建应用
if [ "$SKIP_BUILD" = false ]; then
  echo -e "${YELLOW}>>> [4/6] 构建应用${NC}"
  npm run build
  echo -e "${GREEN}    构建完成${NC}"
else
  echo -e "${YELLOW}>>> [4/6] 跳过构建 (--skip-build)${NC}"
fi
echo ""

# 5. 重启服务
echo -e "${YELLOW}>>> [5/6] 重启服务${NC}"
if pm2 list | grep -q "$APP_NAME"; then
  pm2 restart "$APP_NAME"
  echo -e "${GREEN}    服务已重启${NC}"
else
  pm2 start ecosystem.config.js --env production
  echo -e "${GREEN}    服务已启动${NC}"
fi
echo ""

# 6. 显示状态和日志
echo -e "${YELLOW}>>> [6/6] 部署完成，显示状态${NC}"
echo ""
pm2 status "$APP_NAME"
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}   部署成功！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "常用命令："
echo -e "  查看日志: ${GREEN}pm2 logs $APP_NAME${NC}"
echo -e "  实时监控: ${GREEN}pm2 monit${NC}"
echo -e "  重启服务: ${GREEN}pm2 restart $APP_NAME${NC}"
echo ""

# 显示最近日志
echo -e "${YELLOW}最近日志:${NC}"
pm2 logs "$APP_NAME" --lines 15 --nostream
