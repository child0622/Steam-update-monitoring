@echo off
chcp 65001 >nul
title Steam 监控助手启动器
cd steam-monitor-v2

echo ========================================================
echo       🚀 正在启动 Steam 游戏更新监控助手...
echo ========================================================
echo.

:: 1. 强制清理残留进程 (防止上次关闭不彻底导致端口被占)
echo [1/4] 正在清理旧进程...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 >nul

:: 2. 检查依赖
if not exist node_modules (
    echo [系统检测] 初次运行，正在为你安装必要组件...
    call npm install
    echo.
)

:: 3. 启动服务 (使用 start /min 最小化运行，确保进程存活)
echo [2/4] 正在启动服务...
:: 使用 call 确保命令执行，不使用 start /min 避免环境问题
:: 改为直接在当前窗口运行，不再隐藏，确保稳定性
echo.
echo ⚠️  服务正在启动中，请勿关闭此窗口！
echo.

:: 使用 start 启动一个新窗口来运行 npm run dev，这样当前窗口可以继续执行检测逻辑
start "SteamMonitorServer" /min cmd /c "npm run dev"

:: 4. 循环检测服务是否启动成功 (检测端口 5173)
echo [3/4] 正在等待服务响应...
set retry_count=0

:check_port
timeout /t 1 >nul
netstat -ano | findstr ":5173" >nul
if %errorlevel% equ 0 goto success

set /a retry_count+=1
if %retry_count% geq 20 goto fail
goto check_port

:success
echo [4/4] ✅ 服务启动成功！
echo.
echo 浏览器即将自动打开...
echo.
echo ⚠️  重要提示：
echo ----------------------------------------------------
echo 一个最小化的窗口 "SteamMonitorServer" 已经启动。
echo 请不要关闭它！关闭它会导致网页无法访问。
echo ----------------------------------------------------
echo.
echo 本窗口将在 5 秒后自动关闭。
timeout /t 5
exit

:fail
echo.
echo ❌ [错误] 服务启动超时或失败！
echo.
echo 正在尝试显示错误日志...
echo 请手动运行 npm run dev 查看详细错误。
pause
exit
