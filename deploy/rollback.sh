#!/bin/bash
#
# 数据库回滚脚本
#
# 此脚本用于在部署出现问题时回滚到之前的版本
#
# 使用方法：
#   ./deploy/rollback.sh [backup-file]
#
# 参数：
#   backup-file - 可选，指定要恢复的备份文件路径
#                 如未指定，将列出可用备份供选择
#

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
APP_DIR="/home/deploy/game-score"
DB_PATH="$APP_DIR/prisma/data/prod.db"
BACKUP_DIR="/home/deploy/backups"
APP_NAME="game-score"

cd "$APP_DIR"

# 列出可用备份
list_backups() {
  echo -e "${YELLOW}可用的备份文件:${NC}"
  echo ""
  ls -lht "$BACKUP_DIR"/prod-*.db 2>/dev/null | head -10 | nl
  echo ""
}

# 回滚函数
do_rollback() {
  local backup_file="$1"

  if [ ! -f "$backup_file" ]; then
    echo -e "${RED}错误: 备份文件不存在 - $backup_file${NC}"
    exit 1
  fi

  echo -e "${YELLOW}即将执行回滚:${NC}"
  echo -e "  备份文件: ${GREEN}$backup_file${NC}"
  echo -e "  目标位置: ${GREEN}$DB_PATH${NC}"
  echo ""

  read -p "确认回滚? (y/N): " confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo -e "${YELLOW}已取消回滚${NC}"
    exit 0
  fi

  # 停止服务
  echo -e "${YELLOW}停止服务...${NC}"
  pm2 stop "$APP_NAME" 2>/dev/null || true

  # 备份当前数据库
  if [ -f "$DB_PATH" ]; then
    CURRENT_BACKUP="$BACKUP_DIR/pre-rollback-$(date +%Y%m%d%H%M%S).db"
    cp "$DB_PATH" "$CURRENT_BACKUP"
    echo -e "${GREEN}当前数据库已备份: $CURRENT_BACKUP${NC}"
  fi

  # 恢复备份
  cp "$backup_file" "$DB_PATH"
  echo -e "${GREEN}数据库已恢复${NC}"

  # 重启服务
  echo -e "${YELLOW}重启服务...${NC}"
  pm2 restart "$APP_NAME"

  echo -e "${GREEN}回滚完成！${NC}"
}

# 主逻辑
if [ -n "$1" ]; then
  # 指定了备份文件
  do_rollback "$1"
else
  # 未指定，列出可用备份
  if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR/prod-*.db 2>/dev/null)" ]; then
    echo -e "${RED}错误: 没有找到备份文件${NC}"
    exit 1
  fi

  list_backups

  echo -e "请输入要恢复的备份编号 (1-10)，或输入完整路径:"
  read -p "> " selection

  if [[ "$selection" =~ ^[0-9]+$ ]]; then
    # 用户输入了编号
    backup_file=$(ls -t "$BACKUP_DIR"/prod-*.db | sed -n "${selection}p")
    if [ -z "$backup_file" ]; then
      echo -e "${RED}无效的编号${NC}"
      exit 1
    fi
  else
    # 用户输入了路径
    backup_file="$selection"
  fi

  do_rollback "$backup_file"
fi
