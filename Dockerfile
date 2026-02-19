# 遠端終端 Docker 映像 (支援行動裝置瀏覽器 + 觸控快捷鍵)
FROM node:20-slim

ENV DEBIAN_FRONTEND=noninteractive

# 安裝系統工具
RUN apt-get update && apt-get install -y \
    openssh-server \
    sudo \
    curl \
    wget \
    git \
    vim \
    nano \
    net-tools \
    iputils-ping \
    htop \
    tmux \
    screen \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 創建 SSH 目錄
RUN mkdir -p /run/sshd

# 創建非 root 用戶
RUN useradd -m -s /bin/bash -G sudo remoteuser && \
    echo 'remoteuser:password123' | chpasswd && \
    echo 'remoteuser ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

# 配置 SSH
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config

# 設置 root 密碼
RUN echo 'root:rootpassword' | chpasswd

# 複製應用程式
WORKDIR /app
COPY package.json ./
RUN npm install
COPY server.js ./
COPY public/ ./public/

# 複製啟動腳本
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 暴露埠: 22=SSH, 8080=Web 終端
EXPOSE 22 8080

CMD ["/entrypoint.sh"]
