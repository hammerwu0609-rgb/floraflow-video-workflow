# Workbench 一键连接部署指南

阿里云轻量应用服务器的 **Workbench 远程连接** 就是浏览器里的 SSH 终端，完全可以用来部署 FloraFlow。

## 第一步：打开 Workbench

1. 登录 [阿里云控制台](https://swas.console.aliyun.com/)
2. 找到你的轻量服务器实例
3. 点击 **「远程连接」** → 选择 **「Workbench 一键连接」**
4. 输入 root 密码（或 SSH 密钥）进入终端

## 第二步：上传项目文件

### 方式 A：Workbench 文件上传（推荐）

1. 在 Workbench 终端上方，点击 **「文件」** 图标
2. 在本地将项目文件夹打包为 `floraflow.zip`
3. 上传到服务器 `/root/` 目录
4. 在终端执行：

```bash
cd /root
unzip floraflow.zip -d /opt/floraflow
# 如果 zip 内有一层目录，确保最终路径为 /opt/floraflow/package.json
```

### 方式 B：Git 克隆

如果项目已推送到 Git 仓库：

```bash
cd /opt
git clone <你的仓库地址> floraflow
```

## 第三步：执行部署

在 Workbench 终端中依次执行：

```bash
cd /opt/floraflow
sudo bash deploy/deploy.sh
```

脚本会自动：
- 安装 Node.js 22 和 Nginx
- 构建前端、启动后端
- 生成随机 `SESSION_SECRET` 和默认密码
- 配置开机自启

部署完成后，终端会显示：
- 访问地址（公网 IP）
- 三个团队成员的登录账号和密码

**请立即记录并修改密码！**

## 第四步：开放防火墙

1. 回到阿里云控制台 → 轻量服务器 → **「防火墙」**
2. 添加规则：协议 **TCP**，端口 **80**
3. 保存

## 第五步：团队登录

浏览器访问 `http://你的公网IP`，使用以下账号登录：

| 角色 | 默认用户名 | 密码位置 |
|------|-----------|---------|
| 主剪辑师 | chris | 部署脚本输出 / `.env` 文件 |
| AIGC 创作者 | alex | 同上 |
| 音效设计师 | sam | 同上 |

修改密码：编辑 `/opt/floraflow/.env` 中的 `AUTH_*_PASS`，然后：

```bash
sudo systemctl restart floraflow
```

## 常用运维命令（Workbench 中执行）

```bash
# 查看服务状态
sudo systemctl status floraflow

# 查看实时日志
sudo journalctl -u floraflow -f

# 重启服务
sudo systemctl restart floraflow

# 查看当前账号配置
cat /opt/floraflow/.env
```

## 常见问题

**Q: Workbench 连接后命令没反应？**  
刷新页面重新连接，或检查实例是否在运行。

**Q: 访问公网 IP 打不开？**  
确认防火墙已放行 TCP 80，且 `systemctl status floraflow` 和 `systemctl status nginx` 均为 active。

**Q: 上传大视频失败？**  
Nginx 已配置 500MB 上限。如需更大，修改 `deploy/nginx.conf` 中的 `client_max_body_size` 后 `sudo systemctl restart nginx`。

**Q: 忘记密码？**  
在 Workbench 中编辑 `/opt/floraflow/.env`，修改 `AUTH_*_PASS`，然后 `sudo systemctl restart floraflow`。
