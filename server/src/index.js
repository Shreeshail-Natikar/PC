import 'dotenv/config';
import http from 'http';
import os from 'os';
import app from './app.js';
import { initSocket } from './sockets/index.js';

const PORT = process.env.PORT || 5000;

function getLocalIPs() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;x
}

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, '0.0.0.0', () => {
  const urls = [`http://localhost:${PORT}`];
  for (const ip of getLocalIPs()) urls.push(`http://${ip}:${PORT}`);
  console.log(`🌐 App ready → ${urls[0]}`);
  if (urls.length > 1) console.log(`📡 LAN URLs:  ${urls.slice(1).map((u) => u).join(', ')}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
