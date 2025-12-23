const crypto = require("crypto");
const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const PORT = process.env.PORT || 3000;
const SIGNING_SECRET = process.env.SIGNING_SECRET || "local-dev-secret";

const participants = new Map();

const signSession = (sessionId) =>
  crypto
    .createHmac("sha256", SIGNING_SECRET)
    .update(sessionId)
    .digest("hex");

const safeEqual = (a, b) => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
};

const validateSignature = (sessionId, signature) => {
  if (!sessionId || !signature) {
    return false;
  }
  return safeEqual(signSession(sessionId), signature);
};

const serializeParticipant = (participant) => ({
  id: participant.id,
  sessionId: participant.sessionId,
  displayName: participant.displayName,
  joinedAt: participant.joinedAt,
  lastPacketAt: participant.lastPacketAt,
  level: participant.level,
  trackDurationMs: participant.trackDurationMs,
  source: participant.source,
});

const broadcastParticipants = (sessionId) => {
  const payload = JSON.stringify({
    type: "participants",
    sessionId,
    participants: Array.from(participants.values())
      .filter((participant) => participant.sessionId === sessionId)
      .map(serializeParticipant),
  });

  for (const [_, participant] of participants.entries()) {
    if (participant.sessionId !== sessionId) {
      continue;
    }
    if (participant.ws.readyState === participant.ws.OPEN) {
      participant.ws.send(payload);
    }
  }
};

app.use("/public", express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "landing.html"));
});

app.get("/join-link", (req, res) => {
  const sessionId = req.query.session;
  if (!sessionId) {
    return res.status(400).json({ error: "session query param required" });
  }
  const signature = signSession(sessionId);
  res.json({
    sessionId,
    signature,
    url: `${req.protocol}://${req.get("host")}/session/${sessionId}?sig=${signature}`,
  });
});

app.get("/session/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const signature = req.query.sig;
  if (!validateSignature(sessionId, signature)) {
    return res.status(403).send("Invalid or missing signature");
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname !== "/ws") {
    socket.destroy();
    return;
  }
  const sessionId = url.searchParams.get("session");
  const signature = url.searchParams.get("sig");
  if (!validateSignature(sessionId, signature)) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, { sessionId });
  });
});

wss.on("connection", (ws, { sessionId }) => {
  const clientId = crypto.randomUUID();
  const participant = {
    id: clientId,
    sessionId,
    displayName: `WebApp-${clientId.slice(0, 4)}`,
    joinedAt: Date.now(),
    lastPacketAt: null,
    level: 0,
    trackDurationMs: 0,
    source: "webapp",
    ws,
  };

  participants.set(clientId, participant);
  ws.send(
    JSON.stringify({
      type: "welcome",
      clientId,
      serverTime: Date.now(),
      sessionId,
    })
  );
  broadcastParticipants(sessionId);

  ws.on("message", (data) => {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch (error) {
      return;
    }

    if (message.type === "ping") {
      ws.send(
        JSON.stringify({
          type: "pong",
          clientSentAt: message.clientSentAt,
          serverTime: Date.now(),
        })
      );
      return;
    }

    if (message.type === "hello") {
      participant.displayName = message.displayName || participant.displayName;
      broadcastParticipants(sessionId);
      return;
    }

    if (message.type === "level") {
      participant.level = message.level || 0;
      participant.lastPacketAt = message.clientTimestamp || Date.now();
      broadcastParticipants(sessionId);
      return;
    }

    if (message.type === "chunk") {
      participant.lastPacketAt = message.clientTimestamp || Date.now();
      participant.trackDurationMs = Math.max(
        participant.trackDurationMs,
        message.trackDurationMs || 0
      );
      broadcastParticipants(sessionId);
      return;
    }
  });

  ws.on("close", () => {
    participants.delete(clientId);
    broadcastParticipants(sessionId);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
