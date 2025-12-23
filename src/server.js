const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const { openDatabase, applyMigrations } = require('./db');
const { signToken, verifyToken, extractToken } = require('./auth');

const PORT = Number(process.env.PORT || 3000);

const app = express();
app.use(express.json());

const db = openDatabase();
applyMigrations(db);

function requireSignedToken(purpose) {
  return (req, res, next) => {
    const token = extractToken(req);
    const result = verifyToken(token);
    if (!result.valid) {
      return res.status(401).json({ error: 'unauthorized', reason: result.error });
    }
    const { payload } = result;
    if (payload.purpose !== purpose || payload.sessionId !== req.params.sessionId) {
      return res.status(403).json({ error: 'forbidden' });
    }
    req.auth = payload;
    return next();
  };
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/sessions/:id', (req, res) => {
  const session = db
    .prepare('SELECT * FROM sessions WHERE id = ?')
    .get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'not_found' });
  }
  const participants = db
    .prepare('SELECT * FROM session_participants WHERE session_id = ?')
    .all(req.params.id);
  const notes = db
    .prepare('SELECT * FROM session_notes WHERE session_id = ?')
    .all(req.params.id);
  return res.json({ session, participants, notes });
});

app.get('/sessions/:id/downloads', (req, res) => {
  const token = extractToken(req);
  const result = verifyToken(token);
  if (!result.valid) {
    return res.status(401).json({ error: 'unauthorized', reason: result.error });
  }
  const { payload } = result;
  if (payload.purpose !== 'downloads' || payload.sessionId !== req.params.id) {
    return res.status(403).json({ error: 'forbidden' });
  }
  const exportsList = db
    .prepare('SELECT * FROM recordings_exports WHERE session_id = ?')
    .all(req.params.id)
    .map((record) => {
      const downloadToken = signToken({
        purpose: 'download-link',
        sessionId: req.params.id,
        exportId: record.id,
      });
      const separator = record.export_url.includes('?') ? '&' : '?';
      return {
        ...record,
        signed_url: `${record.export_url}${separator}token=${downloadToken}`,
      };
    });
  return res.json({ exports: exportsList });
});

app.post('/webapp/:sessionId/join', requireSignedToken('webapp'), (req, res) => {
  const { userId, displayName } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: 'userId_required' });
  }

  const upsertUser = db.prepare(
    `INSERT INTO users (user_id, display_name)
     VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET display_name = excluded.display_name,
     updated_at = datetime('now')`
  );
  upsertUser.run(userId, displayName || null);

  const insertParticipant = db.prepare(
    `INSERT INTO session_participants (session_id, user_id)
     VALUES (?, ?)`
  );
  insertParticipant.run(req.params.sessionId, userId);

  return res.status(201).json({ joined: true });
});

const server = http.createServer(app);

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, request, auth) => {
  ws.send(
    JSON.stringify({
      message: 'connected',
      sessionId: auth.sessionId,
      purpose: auth.purpose,
    })
  );
  ws.on('message', (data) => {
    ws.send(
      JSON.stringify({
        echo: data.toString(),
      })
    );
  });
});

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const match = url.pathname.match(/^\/webapp\/(.+)\/stream$/);
  if (!match) {
    socket.destroy();
    return;
  }
  const sessionId = match[1];
  const token = url.searchParams.get('token');
  const result = verifyToken(token);
  if (!result.valid || result.payload.purpose !== 'webapp' || result.payload.sessionId !== sessionId) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request, result.payload);
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on ${PORT}`);
});
