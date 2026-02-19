# 真正的遠端終端 (Hugging Face Spaces + 行動裝置觸控快捷鍵)
FROM node:20

ENV DEBIAN_FRONTEND=noninteractive

# ============ 安裝完整的開發工具 ============
RUN apt-get update && apt-get install -y \
    # 基本工具
    sudo bash-completion locales man-db less \
    # 編輯器
    vim nano \
    # 網路工具
    curl wget net-tools iputils-ping dnsutils traceroute netcat-openbsd \
    # 版本控制
    git git-lfs \
    # 編譯工具
    build-essential cmake pkg-config \
    # Python
    python3 python3-pip python3-venv \
    # 系統監控
    htop btop procps lsof \
    # 終端多工
    tmux screen \
    # 檔案工具
    tree zip unzip tar gzip bzip2 xz-utils file jq \
    # SSH 客戶端 (用來連線到其他機器)
    openssh-client \
    # 其他
    ca-certificates gnupg \
    && rm -rf /var/lib/apt/lists/*

# 設定語系 (支援中文)
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && \
    sed -i '/zh_TW.UTF-8/s/^# //g' /etc/locale.gen && \
    locale-gen
ENV LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8

# 創建用戶 (HF Spaces 使用 uid 1000)
# node:20 已有 uid 1000 的 node 用戶，先移除再建立
RUN userdel -r node 2>/dev/null || true && \
    useradd -m -s /bin/bash -u 1000 -G sudo remoteuser && \
    echo 'remoteuser ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

# 設置用戶的 bash 環境
RUN echo '\n\
export PS1="\[\033[01;32m\]\u@terminal\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ "\n\
export TERM=xterm-256color\n\
export COLORTERM=truecolor\n\
export EDITOR=vim\n\
alias ll="ls -alF --color=auto"\n\
alias la="ls -A --color=auto"\n\
alias l="ls -CF --color=auto"\n\
alias grep="grep --color=auto"\n\
alias ..="cd .."\n\
alias ...="cd ../.."\n\
' >> /home/remoteuser/.bashrc && \
    echo '. /usr/share/bash-completion/bash_completion' >> /home/remoteuser/.bashrc

# 複製應用程式
WORKDIR /app
COPY package.json ./
RUN npm install
COPY server.js ./
COPY public/ ./public/

# 複製啟動腳本
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 設置權限
RUN chown -R 1000:1000 /app /home/remoteuser

# 建立工作目錄
RUN mkdir -p /home/remoteuser/workspace && chown 1000:1000 /home/remoteuser/workspace

# HF Spaces 預設埠 7860
EXPOSE 7860

# 以非 root 用戶執行 (HF Spaces 要求)
USER 1000
WORKDIR /home/remoteuser

CMD ["/entrypoint.sh"]
