const { createServer } = require('node:http');
const { spawnSync } = require('node:child_process');
const { parse } = require('node:url');
const next = require('next');
const { Server } = require('socket.io');
const { setIO } = require('./lib/socket-server');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

function runPrismaCommand(args, failureMessage) {
  const prismaCli = require.resolve('prisma/build/index.js');
  const result = spawnSync(
    process.execPath,
    [prismaCli, ...args],
    {
      cwd: __dirname,
      env: process.env,
      stdio: 'inherit',
    }
  );

  if (result.status !== 0) {
    throw new Error(failureMessage);
  }
}

function ensurePrismaClient() {
  runPrismaCommand(
    ['generate'],
    'Failed to generate Prisma client before server start'
  );
}

function ensureDatabaseSchema() {
  runPrismaCommand(
    ['migrate', 'deploy'],
    'Failed to apply Prisma migrations before server start'
  );
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

ensurePrismaClient();
ensureDatabaseSchema();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    socket.on('join-room', (roomId) => {
      socket.join(`room:${roomId}`);
      if (dev) console.log(`[ws] client joined room:${roomId}`);
    });
    socket.on('leave-room', (roomId) => {
      socket.leave(`room:${roomId}`);
    });
  });

  setIO(io);
  global.__SOCKET_IO__ = io;

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket 已启用，实时同步可用`);
  });
});
