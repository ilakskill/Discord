import "dotenv/config";
import { formatHealth } from "@discord-stack/shared";

const intervalMs = Number(process.env.WORKER_INTERVAL_MS ?? 10000);

setInterval(() => {
  const health = formatHealth();
  console.log(`Worker heartbeat: ${health.timestamp}`);
}, intervalMs);
