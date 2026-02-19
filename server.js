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

// 健康檢查
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// WebSocket 連線
wss.on('connection', (ws, req) => {
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`新連線: ${clientIP}`);

  const homeDir = os.homedir();
  let shell;

  function spawnShell() {
    shell = pty.spawn('/bin/bash', ['--login'], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: homeDir,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        HOME: homeDir,
        LANG: 'en_US.UTF-8',
      },
    });

    shell.onData((data) => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'output', data }));
        }
      } catch (e) {}
    });

    shell.onExit(({ exitCode }) => {
      console.log(`Shell 結束 (code: ${exitCode})`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'output', data: '\r\n\x1b[33m[Shell 已結束，正在重啟...]\x1b[0m\r\n' }));
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) spawnShell();
        }, 500);
      }
    });
  }

  spawnShell();

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
    } catch (e) {}
  });

  ws.on('close', () => {
    console.log(`斷線: ${clientIP}`);
    if (shell) try { shell.kill(); } catch (e) {}
  });

  ws.on('error', (err) => {
    console.error('WS error:', err.message);
    if (shell) try { shell.kill(); } catch (e) {}
  });
});

// 心跳
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

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🖥️  終端已啟動: http://0.0.0.0:${PORT}`);
});
