@echo off
REM 填词大作战 - 一键部署脚本
REM 在本地运行，把文件传到服务器并启动

SET SSH_HOST=117.72.205.240
SET SSH_PORT=22
SET SSH_USER=root
IF "%SSH_PASS%"=="" SET /P SSH_PASS=Enter SSH password: 

echo === 打包本地文件 ===
powershell -Command "Compress-Archive -Path 'C:\Users\Chandler Qi\Desktop\fillword_v2\server\*' -DestinationPath '%TEMP%\fillword_server.zip' -Force"
powershell -Command "Compress-Archive -Path 'C:\Users\Chandler Qi\Desktop\fillword_v2\dist\*' -DestinationPath '%TEMP%\fillword_dist.zip' -Force"
echo 打包完成

echo.
echo === 上传到服务器 ===
scp -o StrictHostKeyChecking=no -o ConnectTimeout=15 -P %SSH_PORT% %TEMP%\fillword_server.zip %SSH_USER%@%SSH_HOST%:/tmp/
scp -o StrictHostKeyChecking=no -o ConnectTimeout=15 -P %SSH_PORT% %TEMP%\fillword_dist.zip %SSH_USER%@%SSH_HOST%:/tmp/
echo 上传完成

echo.
echo === 在服务器上解压并安装 ===
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 -P %SSH_PORT% %SSH_USER%@%SSH_HOST% "cd /tmp && unzip -o fillword_server.zip -d /opt/fillword && unzip -o fillword_dist.zip -d /opt/fillword && mv /opt/fillword/dist/* /opt/fillword/ && mv /opt/fillword/server/* /opt/fillword/ && rm -rf /opt/fillword/dist /opt/fillword/server && mkdir -p /opt/fillword/dist/scripts /opt/fillword/dist/styles"
echo 解压完成

echo.
echo === 安装依赖 ===
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 -P %SSH_PORT% %SSH_USER%@%SSH_HOST% "cd /opt/fillword && npm install 2>&1"
echo npm install 完成

echo.
echo === 开放防火墙 ===
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 -P %SSH_PORT% %SSH_USER%@%SSH_HOST% "firewall-cmd --zone=public --add-port=3000/tcp --permanent && firewall-cmd --reload && echo fw done"

echo.
echo === 启动服务 ===
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 -P %SSH_PORT% %SSH_USER%@%SSH_HOST% "cd /opt/fillword && pkill -f 'node server.js' 2>/dev/null; nohup node server.js > server.log 2>&1 &"
echo 启动命令已发送

echo.
echo === 检查服务状态 ===
ping -n 5 127.0.0.1 > nul
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 -P %SSH_PORT% %SSH_USER%@%SSH_HOST% "curl -s http://localhost:3000 > /dev/null && echo SERVER_OK || tail -20 /opt/fillword/server.log"

echo.
echo === 完成 ===
echo 访问：http://%SSH_HOST%:3000
echo 主持人：http://%SSH_HOST%:3000/host
echo 玩家：http://%SSH_HOST%:3000/player
pause
