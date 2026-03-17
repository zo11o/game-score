#!/bin/bash
#
# 服务器初始化脚本
#
# 此脚本用于在全新的 VPS 上配置部署环境
#
# 使用方法：
#   chmod +x deploy/setup-server.sh
#   sudo ./deploy/setup-server.sh
#
# 注意：需要以 root 或 sudo 权限运行
#

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Game Score 服务器初始化${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}请使用 sudo 运行此脚本${NC}"
  exit 1
fi

# 1. 更新系统
echo -e "${YELLOW}>>> [1/7] 更新系统包${NC}"
apt update && apt upgrade -y
echo -e "${GREEN}    系统包已更新${NC}"
echo ""

# 2. 安装 Node.js 20.x
echo -e "${YELLOW}>>> [2/7] 安装 Node.js 20.x${NC}"
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
echo -e "${GREEN}    Node.js 版本: $(node -v)${NC}"
echo -e "${GREEN}    npm 版本: $(npm -v)${NC}"
echo ""

# 3. 安装 PM2
echo -e "${YELLOW}>>> [3/7] 安装 PM2${NC}"
if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
fi
echo -e "${GREEN}    PM2 版本: $(pm2 -v)${NC}"
echo ""

# 4. 安装 Nginx
echo -e "${YELLOW}>>> [4/7] 安装 Nginx${NC}"
if ! command -v nginx &> /dev/null; then
  apt install -y nginx
fi
echo -e "${GREEN}    Nginx 已安装${NC}"
echo ""

# 5. 安装 Git
echo -e "${YELLOW}>>> [5/7] 安装 Git${NC}"
if ! command -v git &> /dev/null; then
  apt install -y git
fi
echo -e "${GREEN}    Git 版本: $(git --version)${NC}"
echo ""

# 6. 安装 Certbot (Let's Encrypt)
echo -e "${YELLOW}>>> [6/7] 安装 Certbot${NC}"
if ! command -v certbot &> /dev/null; then
  apt install -y certbot python3-certbot-nginx
fi
echo -e "${GREEN}    Certbot 已安装${NC}"
echo ""

# 7. 创建部署用户（如果不存在）
echo -e "${YELLOW}>>> [7/7] 配置部署用户${NC}"
if id "deploy" &>/dev/null; then
  echo -e "${GREEN}    deploy 用户已存在${NC}"
else
  adduser --disabled-password --gecos "" deploy
  usermod -aG sudo deploy
  echo -e "${GREEN}    deploy 用户已创建${NC}"
fi
echo ""

# 创建必要目录
echo -e "${YELLOW}>>> 创建目录结构${NC}"
mkdir -p /home/deploy/backups
mkdir -p /var/www/certbot
chown -R deploy:deploy /home/deploy
echo -e "${GREEN}    目录已创建${NC}"
echo ""

# 完成
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}   服务器初始化完成！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "后续步骤："
echo ""
echo -e "1. 切换到 deploy 用户："
echo -e "   ${GREEN}su - deploy${NC}"
echo ""
echo -e "2. 克隆代码："
echo -e "   ${GREEN}git clone git@github.com:zo11o/game-score.git${NC}"
echo -e "   ${GREEN}# 或 git clone https://github.com/zo11o/game-score.git${NC}"
echo ""
echo -e "3. 进入项目目录并配置环境："
echo -e "   ${GREEN}cd game-score${NC}"
echo -e "   ${GREEN}cp .env.production.example .env${NC}"
echo -e "   ${GREEN}nano .env${NC}  # 编辑配置"
echo ""
echo -e "4. 创建数据目录并构建："
echo -e "   ${GREEN}mkdir -p prisma/data${NC}"
echo -e "   ${GREEN}npm ci${NC}"
echo -e "   ${GREEN}npm run build${NC}"
echo ""
echo -e "5. 启动服务："
echo -e "   ${GREEN}pm2 start ecosystem.config.js --env production${NC}"
echo -e "   ${GREEN}pm2 startup${NC}  # 设置开机自启"
echo -e "   ${GREEN}pm2 save${NC}"
echo ""
echo -e "6. 配置 Nginx（需要 sudo）："
echo -e "   ${GREEN}sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/game-score${NC}"
echo -e "   ${GREEN}sudo ln -s /etc/nginx/sites-available/game-score /etc/nginx/sites-enabled/${NC}"
echo -e "   ${GREEN}sudo nginx -t && sudo systemctl reload nginx${NC}"
echo ""
echo -e "7. 配置 HTTPS："
echo -e "   ${GREEN}sudo certbot --nginx -d your-domain.com${NC}"
echo ""
