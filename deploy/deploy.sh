#!/bin/bash
# FloraFlow 阿里云轻量应用服务器一键部署脚本
# 用法: sudo bash deploy/deploy.sh

set -euo pipefail

APP_DIR="/opt/floraflow"
REPO_URL="${REPO_URL:-}"
NODE_VERSION="22"

echo "=== FloraFlow 部署开始 ==="

# 1. 安装依赖
if command -v apt-get &>/dev/null; then
  apt-get update -qq
  apt-get install -y -qq curl git nginx
elif command -v yum &>/dev/null; then
  yum install -y curl git nginx
fi

# 2. 安装 Node.js
if ! command -v node &>/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  if command -v apt-get &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
  elif command -v yum &>/dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -
    yum install -y nodejs
  fi
fi

# 3. 部署代码
mkdir -p "$APP_DIR"
if [ -n "$REPO_URL" ]; then
  git clone "$REPO_URL" "$APP_DIR" || (cd "$APP_DIR" && git pull)
else
  echo "请将项目文件复制到 $APP_DIR（或设置 REPO_URL 环境变量）"
  if [ ! -f "$APP_DIR/package.json" ]; then
    echo "错误: $APP_DIR/package.json 不存在"
    exit 1
  fi
fi

cd "$APP_DIR"
npm ci
npm run build

# 4. 环境配置
if [ ! -f .env ]; then
  cp .env.example .env
fi

# 生成随机密钥和密码（仅首次部署时）
gen_pass() { openssl rand -base64 12 2>/dev/null || head -c 16 /dev/urandom | base64; }

if grep -q "请替换为随机长字符串" .env 2>/dev/null; then
  SECRET=$(gen_pass)
  EDITOR_PASS=$(gen_pass)
  AIGC_PASS=$(gen_pass)
  AUDIO_PASS=$(gen_pass)
  sed -i "s|SESSION_SECRET=.*|SESSION_SECRET=$SECRET|" .env
  sed -i "s|AUTH_EDITOR_PASS=.*|AUTH_EDITOR_PASS=$EDITOR_PASS|" .env
  sed -i "s|AUTH_AIGC_PASS=.*|AUTH_AIGC_PASS=$AIGC_PASS|" .env
  sed -i "s|AUTH_AUDIO_PASS=.*|AUTH_AUDIO_PASS=$AUDIO_PASS|" .env
  echo ""
  echo "=== 团队登录账号（请妥善保存）==="
  echo "  主剪辑师  用户名: chris  密码: $EDITOR_PASS"
  echo "  AIGC成员  用户名: alex   密码: $AIGC_PASS"
  echo "  音效成员  用户名: sam    密码: $AUDIO_PASS"
  echo "  修改密码: 编辑 $APP_DIR/.env 后 systemctl restart floraflow"
  echo ""
fi

mkdir -p server/data/uploads

# 5. systemd 服务
cat > /etc/systemd/system/floraflow.service <<EOF
[Unit]
Description=FloraFlow Video Workflow
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=$(which npx) tsx server/index.ts
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable floraflow
systemctl restart floraflow

# 6. Nginx 反向代理
cp deploy/nginx.conf /etc/nginx/conf.d/floraflow.conf 2>/dev/null || \
  cp deploy/nginx.conf /etc/nginx/sites-available/floraflow

if [ -d /etc/nginx/sites-enabled ]; then
  ln -sf /etc/nginx/sites-available/floraflow /etc/nginx/sites-enabled/floraflow
  rm -f /etc/nginx/sites-enabled/default
fi

nginx -t
systemctl enable nginx
systemctl restart nginx

# 7. 防火墙提示
echo ""
echo "=== 部署完成 ==="
echo "请在阿里云轻量服务器防火墙/安全组中放行:"
echo "  - TCP 80  (HTTP 访问)"
echo "  - TCP 443 (如配置 HTTPS)"
echo ""
echo "访问地址: http://$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
echo "服务状态: systemctl status floraflow"
echo "查看日志: journalctl -u floraflow -f"
