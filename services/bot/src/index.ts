import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import { formatHealth } from "@discord-stack/shared";

const token = process.env.DISCORD_TOKEN;

if (!token) {
  throw new Error("DISCORD_TOKEN is required");
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

client.once("ready", () => {
  const health = formatHealth();
  console.log(`Bot ready as ${client.user?.tag} (${health.timestamp})`);
});

client.login(token);
