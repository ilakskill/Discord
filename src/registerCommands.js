const { REST, Routes } = require("discord.js");
const { loadConfig } = require("./config");
const { commands } = require("./core/commands");
const { buildCommandPayloads } = require("./core/commandRegistry");

const registerCommands = async () => {
  const { token, applicationId, guildId } = loadConfig();
  const rest = new REST({ version: "10" }).setToken(token);
  const payload = buildCommandPayloads(commands);

  const route = guildId
    ? Routes.applicationGuildCommands(applicationId, guildId)
    : Routes.applicationCommands(applicationId);

  await rest.put(route, { body: payload });
};

registerCommands()
  .then(() => {
    console.log("Slash commands registered.");
  })
  .catch((error) => {
    console.error("Failed to register commands:", error);
    process.exitCode = 1;
  });
