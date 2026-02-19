const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const pty = require('node-pty');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 靜態檔案
app.use(express.static(path.join(__dirname, 'public')));
app.use('/xterm', express.static(path.join(__dirname, 'node_modules/@xterm/xterm')));
app.use('/xterm-addon-fit', express.static(path.join(__dirname, 'node_modules/@xterm/addon-fit')));
app.use('/xterm-addon-web-links', express.static(path.join(__dirname, 'node_modules/@xterm/addon-web-links')));

// WebSocket 連線處理
wss.on('connection', (ws, req) => {
  console.log('新的終端連線');

  const shell = pty.spawn('bash', [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: process.env.HOME || '/home/remoteuser',
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
    },
  });

  // 終端輸出 → 瀏覽器
  shell.onData((data) => {
    try {
      ws.send(JSON.stringify({ type: 'output', data }));
    } catch (e) {}
  });

  // 終端結束
  shell.onExit(({ exitCode }) => {
    try {
      ws.send(JSON.stringify({ type: 'exit', code: exitCode }));
      ws.close();
    } catch (e) {}
  });

  // 瀏覽器 → 終端
  ws.on('message', (msg) => {
    try {
      const parsed = JSON.parse(msg);
      switch (parsed.type) {
        case 'input':
          shell.write(parsed.data);
          break;
        case 'resize':
          shell.resize(parsed.cols, parsed.rows);
          break;
      }
    } catch (e) {
      console.error('訊息解析錯誤:', e);
    }
  });

  ws.on('close', () => {
    console.log('終端連線關閉');
    shell.kill();
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🖥️  遠端終端已啟動: http://0.0.0.0:${PORT}`);
});
