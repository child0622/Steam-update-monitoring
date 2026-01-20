@echo off
chcp 65001 >nul
title Steam 监控助手启动器
echo ========================================================
echo       🚀 正在启动 Steam 游戏更新监控助手...
echo ========================================================
echo.

cd steam-monitor-v2

if not exist node_modules (
    echo [系统检测] 初次运行，正在为你安装必要组件（仅需一次）...
    call npm install
    echo.
    echo ✅ 组件安装完成！
    echo.
)

echo [1/2] 正在启动本地服务...
echo [2/2] 稍后将自动打开浏览器，请保持此窗口开启...
echo.
echo (如果浏览器没有自动打开，请手动访问 http://localhost:5173)
echo.

call npm run dev
