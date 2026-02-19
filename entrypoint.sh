#!/bin/bash

# 啟動 SSH 服務 (背景執行)
/usr/sbin/sshd

echo "============================================"
echo "  遠端終端已啟動"
echo "============================================"
echo ""
echo "  Web 終端 (手機/平板/電腦瀏覽器):"
echo "    http://localhost:8080"
echo ""
echo "  SSH 連線 (電腦):"
echo "    ssh -p 2222 remoteuser@localhost"
echo ""
echo "  帳號: remoteuser / password123"
echo ""
echo "  手機快捷鍵工具列："
echo "    Ctrl, Alt, Tab, Esc, 方向鍵"
echo "    ^C, ^D, ^Z, ^L"
echo "============================================"

# 啟動 Node.js Web 終端
cd /app
exec node server.js
