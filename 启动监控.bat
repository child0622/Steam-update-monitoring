@echo off
chcp 65001 >nul
title Steam 监控助手启动器
cd steam-monitor-v2

echo ========================================================
echo       🚀 正在启动 Steam 游戏更新监控助手...
echo ========================================================
echo.

:: 1. 检查依赖
if not exist node_modules (
    echo [系统检测] 初次运行，正在为你安装必要组件...
    call npm install
    echo.
)

:: 2. 检查端口是否已被占用 (防止重复启动)
netstat -ano | findstr ":5173" >nul
if %errorlevel% equ 0 (
    echo [提示] 检测到服务已经在运行中！
    echo 正在直接打开浏览器...
    start http://localhost:5173
    timeout /t 3
    exit
)

:: 3. 创建隐藏运行脚本 (VBS)
echo Set WshShell = CreateObject("WScript.Shell") > start_server.vbs
echo WshShell.Run "npm run dev", 0 >> start_server.vbs

:: 4. 启动服务
echo [1/3] 正在后台启动服务...
wscript start_server.vbs
del start_server.vbs

:: 5. 循环检测服务是否启动成功 (检测端口 5173)
echo [2/3] 正在等待服务响应...
set retry_count=0

:check_port
timeout /t 1 >nul
netstat -ano | findstr ":5173" >nul
if %errorlevel% equ 0 goto success

set /a retry_count+=1
if %retry_count% geq 15 goto fail
goto check_port

:success
echo [3/3] ✅ 服务启动成功！
echo.
echo 浏览器即将自动打开...
echo 本窗口将在 3 秒后自动关闭，服务将继续在后台运行。
echo.
echo (如需完全停止服务，请运行桌面的【停止监控.bat】)
timeout /t 3
exit

:fail
echo.
echo ❌ [错误] 服务启动超时或失败！
echo 可能原因：
echo 1. 端口 5173 被其他程序占用
echo 2. Node.js 环境配置错误
echo.
echo 正在尝试清理进程...
taskkill /F /IM node.exe >nul 2>&1
pause
exit
