#!/bin/bash

# 確保 HOME 目錄正確
export HOME=/home/remoteuser
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

echo "============================================"
echo "  遠端終端已啟動"
echo "============================================"
echo "  埠號: ${PORT:-7860}"
echo "  用戶: $(whoami)"
echo "  HOME: $HOME"
echo "  系統: $(uname -srm)"
echo "============================================"

# 啟動 Node.js Web 終端
cd /app
exec node server.js
