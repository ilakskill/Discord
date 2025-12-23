const sessionMeta = document.getElementById("session-meta");
const connectionStatus = document.getElementById("connection-status");
const startButton = document.getElementById("start-button");
const stopButton = document.getElementById("stop-button");
const downloadButton = document.getElementById("download-button");
const exportButton = document.getElementById("export-button");
const clockOffsetEl = document.getElementById("clock-offset");
const clockDriftEl = document.getElementById("clock-drift");
const clockRttEl = document.getElementById("clock-rtt");
const chunkCountEl = document.getElementById("chunk-count");
const trackDurationEl = document.getElementById("track-duration");
const exportSourceEl = document.getElementById("export-source");
const participantsBody = document.getElementById("participants-body");

const url = new URL(window.location.href);
const sessionId = url.pathname.split("/").pop();
const signature = url.searchParams.get("sig");

sessionMeta.textContent = `Session ${sessionId} (signed)`;

const ws = new WebSocket(
  `${window.location.protocol === "https:" ? "wss" : "ws"}://` +
    `${window.location.host}/ws?session=${encodeURIComponent(sessionId)}&sig=${encodeURIComponent(
      signature
    )}`
);

let clientId = null;
let recorder = null;
let mediaStream = null;
let analyser = null;
let audioContext = null;
let animationFrame = null;
let trackStart = null;
let trackDurationMs = 0;
let recordedChunks = [];
let levelInterval = null;

const clockSamples = [];
const MAX_SAMPLES = 20;
let clockOffset = 0;
let clockDrift = 0;
let lastRtt = 0;

const participants = new Map();

const updateClockDisplay = () => {
  clockOffsetEl.textContent = clockOffset.toFixed(1);
  clockDriftEl.textContent = clockDrift.toFixed(4);
  clockRttEl.textContent = lastRtt.toFixed(1);
};

const updateLocalStats = () => {
  chunkCountEl.textContent = recordedChunks.length;
  trackDurationEl.textContent = (trackDurationMs / 1000).toFixed(1);
  exportSourceEl.textContent = chooseExportSource({
    webappAvailable: recordedChunks.length > 0,
    lastPacketAt: Date.now(),
  });
};

const chooseExportSource = ({ webappAvailable, lastPacketAt }) => {
  const webappFresh = webappAvailable && Date.now() - lastPacketAt < 8000;
  return webappFresh ? "WebApp" : "Discord";
};

const updateParticipantsTable = () => {
  participantsBody.innerHTML = "";
  const now = Date.now();
  for (const participant of participants.values()) {
    const row = document.createElement("tr");
    const lastPacketText = participant.lastPacketAt
      ? `${((now - participant.lastPacketAt) / 1000).toFixed(1)}s ago`
      : "No packets";
    const exportSource = chooseExportSource({
      webappAvailable: participant.source === "webapp",
      lastPacketAt: participant.lastPacketAt || 0,
    });
    row.innerHTML = `
      <td>${participant.displayName}</td>
      <td>${participant.level.toFixed(2)}</td>
      <td>${lastPacketText}</td>
      <td>${(participant.trackDurationMs / 1000).toFixed(1)}s</td>
      <td>${exportSource}</td>
    `;
    participantsBody.appendChild(row);
  }
};

const computeClockModel = () => {
  if (clockSamples.length < 2) {
    return;
  }
  const n = clockSamples.length;
  const meanX = clockSamples.reduce((sum, s) => sum + s.clientTime, 0) / n;
  const meanY = clockSamples.reduce((sum, s) => sum + s.offset, 0) / n;
  let num = 0;
  let den = 0;
  for (const sample of clockSamples) {
    const dx = sample.clientTime - meanX;
    num += dx * (sample.offset - meanY);
    den += dx * dx;
  }
  clockDrift = den === 0 ? 0 : num / den;
  clockOffset = meanY - clockDrift * meanX;
};

const syncClock = () => {
  const clientSentAt = Date.now();
  ws.send(JSON.stringify({ type: "ping", clientSentAt }));
};

const correctedTimestamp = (clientTime) => {
  return clientTime + clockOffset + clockDrift * clientTime;
};

const setupLevelMeter = () => {
  const source = audioContext.createMediaStreamSource(mediaStream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const data = new Uint8Array(analyser.fftSize);

  const tick = () => {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const value of data) {
      const normalized = (value - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / data.length);
    return rms;
  };

  levelInterval = setInterval(() => {
    const level = tick();
    ws.send(
      JSON.stringify({
        type: "level",
        level,
        clientTimestamp: correctedTimestamp(Date.now()),
      })
    );
  }, 500);
};

const startRecording = async () => {
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioContext = new AudioContext();
  setupLevelMeter();

  recorder = new MediaRecorder(mediaStream, { mimeType: "audio/webm" });
  recordedChunks = [];
  trackStart = Date.now();
  trackDurationMs = 0;

  recorder.ondataavailable = async (event) => {
    if (!event.data || event.data.size === 0) {
      return;
    }
    const arrayBuffer = await event.data.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    recordedChunks.push(event.data);
    trackDurationMs = Date.now() - trackStart;

    ws.send(
      JSON.stringify({
        type: "chunk",
        clientTimestamp: correctedTimestamp(Date.now()),
        trackDurationMs,
        payload: base64,
      })
    );
    updateLocalStats();
  };

  recorder.start(1000);
  startButton.disabled = true;
  stopButton.disabled = false;
  downloadButton.disabled = true;
};

const stopRecording = () => {
  if (recorder && recorder.state !== "inactive") {
    recorder.stop();
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
  }
  if (audioContext) {
    audioContext.close();
  }
  if (levelInterval) {
    clearInterval(levelInterval);
  }
  startButton.disabled = false;
  stopButton.disabled = true;
  downloadButton.disabled = recordedChunks.length === 0;
};

const downloadTrack = () => {
  const blob = new Blob(recordedChunks, { type: "audio/webm" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${sessionId}-webapp-track.webm`;
  anchor.click();
  URL.revokeObjectURL(url);
};

const exportPreferredTrack = () => {
  const source = chooseExportSource({
    webappAvailable: recordedChunks.length > 0,
    lastPacketAt: Date.now(),
  });
  exportSourceEl.textContent = source;
  alert(`Exporting ${source} track for session ${sessionId}.`);
};

ws.addEventListener("open", () => {
  connectionStatus.textContent = "Connected";
  connectionStatus.classList.add("connected");
  ws.send(
    JSON.stringify({
      type: "hello",
      displayName: `WebApp-${Math.floor(Math.random() * 1000)}`,
    })
  );
  syncClock();
  setInterval(syncClock, 5000);
});

ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.type === "welcome") {
    clientId = message.clientId;
  }
  if (message.type === "pong") {
    const clientReceivedAt = Date.now();
    lastRtt = clientReceivedAt - message.clientSentAt;
    const offset = message.serverTime - (message.clientSentAt + lastRtt / 2);
    clockSamples.push({ clientTime: clientReceivedAt, offset });
    if (clockSamples.length > MAX_SAMPLES) {
      clockSamples.shift();
    }
    computeClockModel();
    updateClockDisplay();
  }
  if (message.type === "participants") {
    participants.clear();
    message.participants.forEach((participant) => {
      participants.set(participant.id, participant);
    });
    updateParticipantsTable();
  }
});

ws.addEventListener("close", () => {
  connectionStatus.textContent = "Disconnected";
  connectionStatus.classList.remove("connected");
});

startButton.addEventListener("click", () => {
  startRecording().catch((error) => {
    alert(`Unable to start recording: ${error.message}`);
  });
});

stopButton.addEventListener("click", stopRecording);

downloadButton.addEventListener("click", downloadTrack);

exportButton.addEventListener("click", exportPreferredTrack);

updateClockDisplay();
updateLocalStats();
