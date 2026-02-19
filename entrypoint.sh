#!/bin/bash

export HOME=/home/remoteuser
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export TERM=xterm-256color

echo "============================================"
echo "  Ubuntu 遠端終端已啟動"
echo "============================================"
echo "  系統: $(lsb_release -ds 2>/dev/null || cat /etc/os-release | grep PRETTY | cut -d= -f2)"
echo "  用戶: $(whoami)"
echo "  埠號: ${PORT:-7860}"
echo "============================================"

# 啟動 ttyd（Web 終端）
exec ttyd \
    --port "${PORT:-7860}" \
    --writable \
    --client-option fontSize=15 \
    --client-option cursorBlink=true \
    --client-option theme='{"background":"#1e1e2e","foreground":"#cdd6f4","cursor":"#f5e0dc"}' \
    bash --login
