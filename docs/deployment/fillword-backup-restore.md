# Fillword 服务器备份与恢复操作手册

## 目标

这份文档专门说明 Fillword 当前线上版本的服务器备份与恢复机制，覆盖以下内容：

- 自动备份在什么时候发生
- 备份文件保存到哪里
- 备份文件包含什么
- 如何查看和管理备份
- 如何用一条命令恢复指定版本
- 恢复过程中系统实际会做哪些事
- 出现异常时应该如何判断和处理

本文档对应当前项目中的两个脚本：

- `server/deploy.sh`
- `server/restore.sh`

## 适用环境

当前文档基于以下线上环境编写：

- 应用目录：`/opt/fillword`
- 服务目录：`/opt/fillword/server`
- 备份目录：`/opt/fillword_backups`
- 进程管理：`pm2`
- 反向代理：宝塔 nginx
- 健康检查地址：`http://127.0.0.1:3000/healthz`
- 外部访问入口：
  - `http://117.72.205.240/fillword/host.html`
  - `http://117.72.205.240/fillword/player.html`

如果未来服务器目录、域名、端口或 nginx 结构发生变化，本文档需要同步更新。

## 机制概览

当前采用的是“部署前自动备份 + 指定备份一键恢复”的方案。

工作方式非常简单：

1. 每次执行 `bash deploy.sh` 前，脚本会先把当前 `/opt/fillword` 整个目录打包。
2. 打包后的备份文件保存到 `/opt/fillword_backups`。
3. 备份文件名带时间戳，便于区分版本。
4. 部署完成后，如果线上出现问题，可以执行 `bash restore.sh <backup-name>` 恢复到某个历史版本。
5. 恢复脚本在真正覆盖前，还会再把“当前线上版本”打一个恢复前快照，避免误恢复后无路可退。

这个方案的重点是：

- 不依赖 git 回滚
- 不依赖本地重新上传旧包
- 不需要手工拼目录
- 恢复动作和部署动作尽量保持一致

## 备份范围

自动备份保存的是整个 `/opt/fillword` 目录，而不是只保存某几个源码文件。

这意味着备份中包含：

- `public/`
- `server/`
- 部署脚本
- 文档
- 当前线上版本的项目目录结构

这样做的好处是恢复时最稳，因为恢复后的目录形态和当时线上实际运行的版本最接近。

需要注意的是：

- 该备份方案不是数据库备份方案
- 该备份方案也不是系统级整机快照
- 它只负责恢复 Fillword 这一套应用目录

## 备份目录与命名规则

### 目录

所有自动备份统一放在：

```bash
/opt/fillword_backups
```

### 文件命名

自动备份文件命名格式为：

```bash
YYYYMMDD-HHMMSS-fillword.tar.gz
```

例如：

```bash
20260503-161500-fillword.tar.gz
20260503-174210-fillword.tar.gz
```

这个格式的好处是：

- 人眼可直接看出生成时间
- 文件名按字典序排序时，基本等同于按时间排序
- 适合脚本自动清理旧版本

### 最新备份标记

最近一次自动备份的文件名会写入：

```bash
/opt/fillword_backups/latest
```

你可以这样查看：

```bash
cat /opt/fillword_backups/latest
```

## 自动备份触发时机

自动备份只在执行部署脚本时触发：

```bash
cd /opt/fillword/server
bash deploy.sh
```

触发顺序是：

1. 创建备份目录
2. 检查 `/opt/fillword` 是否存在
3. 如果存在，则打包当前应用目录
4. 记录最新备份名
5. 清理超出保留数量的旧备份
6. 然后才继续执行安装依赖、启动 pm2、修正 nginx、健康检查

也就是说，备份发生在“新版本正式覆盖并启动之前”。

这正是最关键的安全点：如果新版本部署失败，你仍然保留了部署前的完整可恢复版本。

## 自动保留策略

当前 `deploy.sh` 中默认只保留最近 `5` 份自动备份。

也就是说，当第 `6` 份新备份产生时，最旧的那一份会被自动删除。

这个策略的目的：

- 避免备份目录无限增长
- 降低磁盘占用风险
- 保留最近若干次最有价值的可回滚版本

如果以后你希望保留更多备份，可以修改 `server/deploy.sh` 中的这个变量：

```bash
KEEP_BACKUPS=5
```

例如改成：

```bash
KEEP_BACKUPS=10
```

## 如何查看备份

### 查看全部备份

```bash
ls -lh /opt/fillword_backups
```

### 只看备份包

```bash
ls -lh /opt/fillword_backups/*-fillword.tar.gz
```

### 查看最近一次备份

```bash
cat /opt/fillword_backups/latest
```

### 查看某个备份文件大小

```bash
du -h /opt/fillword_backups/20260503-161500-fillword.tar.gz
```

## 标准备份流程

如果你只是正常发版，不需要单独执行备份命令。

标准流程如下：

1. 上传新版本到服务器
2. 进入部署目录
3. 执行 `bash deploy.sh`
4. 关注输出中的 `当前备份`
5. 确认健康检查通过
6. 打开 host/player 页面做一轮回归

示例：

```bash
cd /opt/fillword/server
bash deploy.sh
```

正常输出里你应该能看到类似信息：

```bash
[0/6] 备份当前版本
...
[6/6] 备份完成
当前备份: /opt/fillword_backups/20260503-161500-fillword.tar.gz
部署完成
```

建议每次部署成功后，把这次输出中的备份文件名记下来。

## 一键恢复流程

### 基本命令

恢复指定版本的标准命令是：

```bash
cd /opt/fillword/server
bash restore.sh 20260503-161500-fillword.tar.gz
```

其中参数必须是备份目录中真实存在的备份文件名。

### 恢复脚本内部会做什么

`restore.sh` 执行时会按以下顺序操作：

1. 校验你是否传入了备份文件名
2. 校验指定备份是否存在
3. 在真正恢复前，再把当前 `/opt/fillword` 打一个“恢复前快照”
4. 删除当前 `/opt/fillword`
5. 将指定备份解压回 `/opt`
6. 进入 `server/` 重新安装依赖
7. 重启 `pm2` 中的 `fillword`
8. 执行健康检查
9. 校验 host/player 页面可访问
10. 输出恢复成功信息

恢复完成后，你会看到类似输出：

```bash
恢复完成
已恢复备份: /opt/fillword_backups/20260503-161500-fillword.tar.gz
恢复前快照: /opt/fillword_backups/20260503-180012-pre-restore-fillword.tar.gz
```

这个“恢复前快照”非常重要。

它的意义是：

- 如果你恢复错了版本
- 或者恢复后发现目标版本本身也有问题

你还可以再恢复回“恢复前”的状态，而不是一条路走死。

## 推荐恢复场景

以下情况建议直接走恢复，而不是现场热修：

- 新版本上线后 host/player 无法进入主流程
- 新版脚本已部署，但线上出现严重协议不一致
- 玩家无法加入房间或结果无法生成
- 发布后出现明显的前端白屏或服务端启动失败
- 你需要快速回到一个之前已经验证稳定的版本

以下情况通常不必立刻恢复：

- 文案小错
- 样式轻微错位
- 非关键日志告警

这类问题可以先评估，再决定是热修还是回滚。

## 恢复后的验证清单

恢复完成后，至少做下面这些检查：

### 服务健康检查

```bash
curl -fsS http://127.0.0.1:3000/healthz
```

### 入口页检查

```bash
curl -fsS -H "Host: 117.72.205.240" http://127.0.0.1/fillword/host.html >/dev/null
curl -fsS -H "Host: 117.72.205.240" http://127.0.0.1/fillword/player.html >/dev/null
```

### 进程检查

```bash
pm2 status
pm2 logs fillword --lines 100
```

### 真实业务回归

至少重新跑一轮：

1. host 建房
2. player 入房
3. player 提交
4. host 生成结果
5. host 关闭房间

如果你恢复的原因和断线/离房有关，建议顺带回归：

- player 未提交就退出
- player 已提交后断线

## 常见操作示例

### 示例 1：部署前自动备份

```bash
cd /opt/fillword/server
bash deploy.sh
```

### 示例 2：查看最近备份

```bash
cat /opt/fillword_backups/latest
```

### 示例 3：列出所有可恢复版本

```bash
ls -lh /opt/fillword_backups
```

### 示例 4：恢复到指定版本

```bash
cd /opt/fillword/server
bash restore.sh 20260503-161500-fillword.tar.gz
```

### 示例 5：恢复错了，再恢复回刚才的状态

假设恢复时脚本输出了：

```bash
恢复前快照: /opt/fillword_backups/20260503-180012-pre-restore-fillword.tar.gz
```

那么你可以再执行：

```bash
cd /opt/fillword/server
bash restore.sh 20260503-180012-pre-restore-fillword.tar.gz
```

## 故障排查

### 1. 提示“备份不存在”

说明传入的文件名不对，或者该备份已经被清理。

先执行：

```bash
ls -lh /opt/fillword_backups
```

确认真实文件名后再恢复。

### 2. 恢复后健康检查失败

先看：

```bash
pm2 status
pm2 logs fillword --lines 100
```

排查点通常包括：

- Node 版本和依赖不匹配
- `ecosystem.config.js` 启动失败
- 代码本身存在语法或运行时错误

### 3. host/player 页面 404

优先检查：

```bash
nginx -t
nginx -s reload
tail -n 100 /www/wwwlogs/smartresume.error.log
```

以及确认：

```bash
curl -H "Host: 117.72.205.240" http://127.0.0.1/fillword/host.html
curl -H "Host: 117.72.205.240" http://127.0.0.1/fillword/player.html
```

不要只打裸 `127.0.0.1/fillword/...` 判断外网入口是否正常，因为 nginx 站点匹配可能依赖 Host 头。

### 4. 磁盘空间不够

查看磁盘：

```bash
df -h
du -sh /opt/fillword_backups
```

如果备份目录过大，可以先人工清理很旧的备份，再重新执行部署或恢复。

清理前务必确认：

- 该版本已经不需要回滚
- 至少保留最近若干个稳定版本

## 操作建议

- 每次部署后，把“当前备份”记录到发布记录里
- 重大上线前，手工确认 `/opt/fillword_backups` 可写
- 恢复后不要只看 `healthz`，一定要跑一轮真实 host/player 流程
- 如果你准备做大改版，上线前最好额外保留一份人工命名的稳定基线备份

## 与现有部署文档的关系

如果你只是在正常发布 Fillword，请先看：

- `docs/deployment/fillword-jdcloud.md`

如果你关心的是：

- 备份原理
- 一键恢复
- 误恢复后的再次回退
- 故障排查

请优先看本文档。
