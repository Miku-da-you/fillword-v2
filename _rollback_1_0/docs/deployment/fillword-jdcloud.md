# Fillword 京东云部署说明

## 目录约定

- 项目部署目录：`/opt/fillword`
- Node 服务目录：`/opt/fillword/server`
- 静态资源目录：`/opt/fillword/public`

## 当前环境

- 云服务器当前使用现成的 Node.js 16
- 反向代理由宝塔 nginx 站点配置托管
- 站点配置文件：`/www/server/panel/vhost/nginx/smartresume.conf`
- 应用进程由 `pm2` 中的 `fillword` 进程托管

## 首次部署

1. 上传项目到 `/opt/fillword`
2. 进入 `server/` 执行 `bash deploy.sh`
3. `deploy.sh` 会自动安装依赖、启动 pm2、修正 nginx 反代并执行健康检查
4. 浏览器打开 `http://117.72.205.240/fillword/host.html`

## 验证

- `curl http://127.0.0.1:3000/healthz`
- `curl -H "Host: 117.72.205.240" http://127.0.0.1/fillword/host.html`
- `curl -H "Host: 117.72.205.240" http://127.0.0.1/fillword/player.html`
- 浏览器打开 `http://117.72.205.240/fillword/host.html`
- 手机打开 `http://117.72.205.240/fillword/player.html`
- 主持人先确认可切换三种模式：`Fillword`、`海龟汤`、`恐怖怪谈`
- `Fillword`：选择 `2-6 人` 任一档位建房，至少两个玩家顺序加入，确认看到不同提示词
- `Fillword`：主持人生成结果，确认结果页包含所有玩家昵称
- `海龟汤`：建房后玩家满员自动进入线索阶段，完成两轮选择后进入最终猜测，再自动公布真相
- `恐怖怪谈`：建房后自动进入章节提交，走完整个章节和结尾投票，确认最终输出完整怪谈结果页

## 更新

1. 覆盖上传新版本到 `/opt/fillword`
2. 进入 `server/` 执行 `bash deploy.sh`
3. 如只改了前端资源，也建议重新执行 `bash deploy.sh`，确保缓存头和 nginx 反代保持一致

## 1.1 上线重点

- 主持人页已从单一剧本入口升级为“模式 + 内容包”双层选择
- 玩家页会根据模式切换表单、线索选择、最终猜测或结尾投票
- 新增模式都由系统自动推进，不依赖主持人手动裁判
- 发布后优先回归 `Fillword` 主模式，再验证 `海龟汤` 与 `恐怖怪谈`

## 常用命令

- 查看 pm2 状态：`pm2 status`
- 查看 pm2 日志：`pm2 logs fillword --lines 100`
- 检查宝塔 nginx 配置：`nginx -t`
- 重新加载 nginx：`nginx -s reload`
- 查看 nginx 错误日志：`tail -n 100 /www/wwwlogs/smartresume.error.log`
