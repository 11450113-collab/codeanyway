# 真正的遠端終端 (Hugging Face Spaces + 行動裝置觸控快捷鍵)
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# ============ 安裝完整 Ubuntu 環境 + ttyd ============
RUN apt-get update && apt-get install -y \
    # 基本系統
    sudo bash-completion locales man-db less software-properties-common \
    # 編輯器
    vim nano \
    # 網路工具
    curl wget net-tools iputils-ping dnsutils traceroute netcat-openbsd \
    # 版本控制
    git git-lfs \
    # 編譯 / 開發
    build-essential cmake pkg-config \
    # Python
    python3 python3-pip python3-venv \
    # Node.js
    nodejs npm \
    # 系統監控
    htop btop procps lsof strace \
    # 終端多工
    tmux screen \
    # 檔案工具
    tree zip unzip tar gzip bzip2 xz-utils file jq \
    # SSH 客戶端
    openssh-client \
    # 其他
    ca-certificates gnupg \
    && rm -rf /var/lib/apt/lists/*

# 安裝 ttyd（Web 終端）
RUN ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "amd64" ]; then TTYD_ARCH="x86_64"; elif [ "$ARCH" = "arm64" ]; then TTYD_ARCH="aarch64"; else TTYD_ARCH="$ARCH"; fi && \
    curl -fSL "https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.${TTYD_ARCH}" -o /usr/local/bin/ttyd && \
    chmod +x /usr/local/bin/ttyd

# 設定語系（支援中文）
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && \
    sed -i '/zh_TW.UTF-8/s/^# //g' /etc/locale.gen && \
    locale-gen
ENV LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8

# 建立用戶（HF Spaces 使用 uid 1000）
RUN useradd -m -s /bin/bash -u 1000 -G sudo remoteuser && \
    echo 'remoteuser ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

# 設置 bash 環境
RUN cat >> /home/remoteuser/.bashrc << 'EOF'
export PS1="\[\033[01;32m\]\u@ubuntu\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ "
export TERM=xterm-256color
export COLORTERM=truecolor
export EDITOR=vim
alias ll="ls -alF --color=auto"
alias la="ls -A --color=auto"
alias l="ls -CF --color=auto"
alias grep="grep --color=auto"
alias ..="cd .."
alias ...="cd ../.."
. /usr/share/bash-completion/bash_completion 2>/dev/null
EOF

# 建立工作目錄
RUN mkdir -p /home/remoteuser/workspace && chown -R 1000:1000 /home/remoteuser

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 7860

USER 1000
WORKDIR /home/remoteuser

CMD ["/entrypoint.sh"]
WORKDIR /home/remoteuser

CMD ["/entrypoint.sh"]
