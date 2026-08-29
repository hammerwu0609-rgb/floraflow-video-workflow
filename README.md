# FloraFlow — AIGC 视频团队协作工作流

面向 AIGC 视频制作团队的云端任务管理与素材库系统，支持任务认领、审核闭环、大文件云盘与真实用户登录。

## 核心功能

| 功能 | 说明 |
|------|------|
| **用户登录** | 三位团队成员独立账号，Session 认证，权限按角色隔离 |
| **团队云盘** | 支持 MP4 视频、WAV 音频等大文件上传、分类存储与下载 |
| **任务认领** | 剪辑师发布需求，AIGC/音效成员主动认领，避免工作撞车 |
| **审核闭环** | 待认领 → 制作中 → 待审核 → 已批准；退回意见自动转为修改任务 |

## 团队账号

| 角色 | 默认用户名 | 环境变量 |
|------|-----------|---------|
| 主剪辑师 | chris | `AUTH_EDITOR_USER` / `AUTH_EDITOR_PASS` |
| AIGC 创作者 | alex | `AUTH_AIGC_USER` / `AUTH_AIGC_PASS` |
| 音效设计师 | sam | `AUTH_AUDIO_USER` / `AUTH_AUDIO_PASS` |

部署脚本会自动生成随机密码并打印在终端，请妥善保存。

## 本地开发

```bash
npm install
cp .env.example .env
# 编辑 .env 设置密码
npm run dev
```

- 前端: http://localhost:3000
- 后端: http://localhost:3001

## 阿里云 Workbench 部署（推荐）

Workbench 一键连接 = 浏览器 SSH，可直接部署。

详细步骤见 **[deploy/WORKBENCH.md](deploy/WORKBENCH.md)**

快速流程：

1. 控制台 → 轻量服务器 → **Workbench 远程连接**
2. 上传项目 zip 到 `/opt/floraflow`（Workbench 文件面板）
3. 终端执行：

```bash
cd /opt/floraflow
sudo bash deploy/deploy.sh
```

4. 防火墙放行 **TCP 80**
5. 浏览器访问 `http://公网IP`，用脚本输出的账号登录

## 其他部署方式

### Docker

```bash
docker compose up -d --build
```

### 手动

```bash
npm ci && npm run build
cp .env.example .env
npm start
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `PORT` | 服务端口（默认 3001） |
| `SESSION_SECRET` | Session 加密密钥（必改） |
| `MAX_FILE_SIZE_MB` | 单文件上传上限（默认 500） |
| `AUTH_*_USER/PASS` | 三位成员账号密码 |
| `COOKIE_SECURE` | HTTPS 时设为 `true` |

## 数据备份

定期备份 `server/data/`（含 `workflow.json` 和 `uploads/`）。

## 技术栈

- 前端: React + Vite + Tailwind CSS
- 后端: Express + Multer + express-session + bcryptjs
- 存储: JSON 文件 + 本地磁盘
