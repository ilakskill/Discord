const { Client, GatewayIntentBits } = require("discord.js");
const { loadConfig } = require("./config");
const { commands } = require("./core/commands");
const { handleInteraction } = require("./handlers/interactionHandler");

const start = async () => {
  const { token } = loadConfig();
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
  });

  client.on("interactionCreate", async (interaction) => {
    try {
      await handleInteraction(interaction, commands);
    } catch (error) {
      console.error("Error handling interaction:", error);
    }
  });

  await client.login(token);
};

start().catch((error) => {
  console.error("Failed to start bot:", error);
  process.exitCode = 1;
});
