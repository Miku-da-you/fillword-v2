# Fillword 京东云部署说明

## 目录约定

- 项目部署目录：`/opt/fillword`
- Node 服务目录：`/opt/fillword/server`
- 静态资源目录：`/opt/fillword/public`
- 服务器备份目录：`/opt/fillword_backups`

## 当前环境

- 云服务器当前使用现成的 Node.js 16
- 反向代理由宝塔 nginx 站点配置托管
- 站点配置文件：`/www/server/panel/vhost/nginx/smartresume.conf`
- 应用进程由 `pm2` 中的 `fillword` 进程托管

## 首次部署

1. 上传项目到 `/opt/fillword`
2. 进入 `server/` 执行 `bash deploy.sh`
3. `deploy.sh` 会先备份当前 `/opt/fillword`，再自动安装依赖、启动 pm2、修正 nginx 反代并执行健康检查
4. 统一运行页入口：`http://117.72.205.240/fillword/app.html`
5. 兼容入口仍保留：
   - `http://117.72.205.240/fillword/host.html`
   - `http://117.72.205.240/fillword/player.html`

## 验证

- `curl http://127.0.0.1:3000/healthz`
- `curl -H "Host: 117.72.205.240" http://127.0.0.1/fillword/app.html`
- `curl -H "Host: 117.72.205.240" http://127.0.0.1/fillword/host.html`
- `curl -H "Host: 117.72.205.240" http://127.0.0.1/fillword/player.html`
- 浏览器打开 `http://117.72.205.240/fillword/app.html`
- 通过统一入口验证：
  - Fillword：房主建房，玩家输入房号加入，全部提交后生成结果
  - 海龟汤：房主建房前选题包，玩家输入房号加入，开始后可以提问和猜测
  - 恐怖怪谈：房主建房前选故事包，玩家输入房号加入，开始后可以阅读并作答
- 兼容入口验证：
  - 打开 `host.html` 与 `player.html` 后都会自动跳转到 `app.html`
- 房主关闭房间后，Player 端收到关闭提示并回到首页
- 额外回归一轮断线容错：
  - 未提交的 player 退出页面后，Host 房间不关闭，加入数回落
  - 已提交的 player 退出页面后，Host 房间不关闭，仍可继续生成结果

## 更新

1. 覆盖上传新版本到 `/opt/fillword`
2. 进入 `server/` 执行 `bash deploy.sh`
3. 如只改了前端资源，也建议重新执行 `bash deploy.sh`，确保缓存头和 nginx 反代保持一致
4. 成功后记下脚本输出的 `当前备份` 路径，后续可直接拿来恢复

## 备份与恢复

- 每次执行 `bash deploy.sh` 前，服务器都会自动把当前 `/opt/fillword` 打包到 `/opt/fillword_backups`
- 备份文件命名格式：`YYYYMMDD-HHMMSS-fillword.tar.gz`
- 最近一次备份文件名会写到：`/opt/fillword_backups/latest`
- 默认只保留最近 `5` 份自动备份
- 详细操作文档：`docs/deployment/fillword-backup-restore.md`
- 查看备份列表：
  - `ls -lh /opt/fillword_backups`
- 一键恢复指定备份：
  - `cd /opt/fillword/server && bash restore.sh 20260503-161500-fillword.tar.gz`
- `restore.sh` 会先把当前线上版本再打一个“恢复前快照”，再解压目标备份、重启 pm2，并执行 `healthz`、host/player 页面校验

## 常用命令

- 查看 pm2 状态：`pm2 status`
- 查看 pm2 日志：`pm2 logs fillword --lines 100`
- 检查宝塔 nginx 配置：`nginx -t`
- 重新加载 nginx：`nginx -s reload`
- 查看 nginx 错误日志：`tail -n 100 /www/wwwlogs/smartresume.error.log`
- AI 环境变量配置：见 `docs/deployment/fillword-ai-config.md`
