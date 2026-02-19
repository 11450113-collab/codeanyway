const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const pty = require('node-pty');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 靜態檔案
app.use(express.static(path.join(__dirname, 'public')));
app.use('/xterm', express.static(path.join(__dirname, 'node_modules/@xterm/xterm')));
app.use('/xterm-addon-fit', express.static(path.join(__dirname, 'node_modules/@xterm/addon-fit')));
app.use('/xterm-addon-web-links', express.static(path.join(__dirname, 'node_modules/@xterm/addon-web-links')));

// 健康檢查 (HF Spaces 需要)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 取得 shell 環境
function getShellEnv() {
  const homeDir = os.homedir() || '/home/remoteuser';
  return {
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    HOME: homeDir,
    USER: os.userInfo().username || 'remoteuser',
    SHELL: '/bin/bash',
    LANG: 'en_US.UTF-8',
    LC_ALL: 'en_US.UTF-8',
    PATH: `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${homeDir}/.local/bin`,
    EDITOR: 'vim',
  };
}

// WebSocket 連線處理
wss.on('connection', (ws, req) => {
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`新的終端連線 from ${clientIP}`);

  const shellEnv = getShellEnv();
  let shell;

  function spawnShell() {
    shell = pty.spawn('/bin/bash', ['--login'], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: shellEnv.HOME,
      env: { ...process.env, ...shellEnv },
    });

    // 終端輸出 → 瀏覽器
    shell.onData((data) => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'output', data }));
        }
      } catch (e) {}
    });

    // 終端結束 → 自動重新產生 (真正的終端不會因為 exit 就消失)
    shell.onExit(({ exitCode }) => {
      console.log(`Shell 結束 (exit code: ${exitCode})`);
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'output', data: '\r\n\x1b[33m[Shell 已結束，正在重新啟動...]\x1b[0m\r\n' }));
          // 自動重新產生一個新的 shell
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              spawnShell();
            }
          }, 500);
        }
      } catch (e) {}
    });

    return shell;
  }

  spawnShell();

  // 瀏覽器 → 終端
  ws.on('message', (msg) => {
    try {
      const parsed = JSON.parse(msg);
      switch (parsed.type) {
        case 'input':
          if (shell) shell.write(parsed.data);
          break;
        case 'resize':
          if (shell && parsed.cols > 0 && parsed.rows > 0) {
            shell.resize(Math.min(parsed.cols, 500), Math.min(parsed.rows, 200));
          }
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    } catch (e) {
      console.error('訊息解析錯誤:', e.message);
    }
  });

  ws.on('close', () => {
    console.log(`終端連線關閉 (${clientIP})`);
    if (shell) {
      try { shell.kill(); } catch (e) {}
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket 錯誤:', err.message);
    if (shell) {
      try { shell.kill(); } catch (e) {}
    }
  });
});

// 心跳檢測：清理斷線的連線
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});

const PORT = process.env.PORT || 7860;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🖥️  遠端終端已啟動: http://0.0.0.0:${PORT}`);
  console.log(`   系統: ${os.platform()} ${os.arch()}`);
  console.log(`   用戶: ${os.userInfo().username}`);
  console.log(`   HOME: ${os.homedir()}`);
});
