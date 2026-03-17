#!/bin/bash
#
# 数据库备份脚本
#
# 此脚本用于定期备份 SQLite 数据库
# 可配合 crontab 实现自动备份
#
# 使用方法：
#   ./deploy/backup.sh
#
# Crontab 示例（每天凌晨 3 点备份）：
#   0 3 * * * /home/deploy/game-score/deploy/backup.sh >> /home/deploy/backups/backup.log 2>&1
#

set -e

# 配置
APP_DIR="/home/deploy/game-score"
DB_PATH="$APP_DIR/prisma/data/prod.db"
BACKUP_DIR="/home/deploy/backups"
RETENTION_DAYS=30

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 确保备份目录存在
mkdir -p "$BACKUP_DIR"

# 生成备份文件名
BACKUP_FILE="$BACKUP_DIR/prod-$(date +%Y%m%d%H%M%S).db"

# 执行备份
if [ -f "$DB_PATH" ]; then
  cp "$DB_PATH" "$BACKUP_FILE"

  # 压缩备份（可选）
  # gzip "$BACKUP_FILE"

  echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] 数据库已备份: $BACKUP_FILE${NC}"

  # 清理旧备份
  DELETED=$(find "$BACKUP_DIR" -name "prod-*.db" -type f -mtime +$RETENTION_DAYS -delete -print 2>/dev/null | wc -l)
  if [ "$DELETED" -gt 0 ]; then
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] 已清理 $DELETED 个旧备份（超过 $RETENTION_DAYS 天）${NC}"
  fi
else
  echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] 警告: 数据库文件不存在 - $DB_PATH${NC}"
  exit 1
fi
