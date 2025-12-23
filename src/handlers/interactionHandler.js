const { findCommand } = require("../core/commandRegistry");

const handleInteraction = async (interaction, commands) => {
  if (!interaction || interaction.type !== "APPLICATION_COMMAND") {
    return { handled: false, reason: "unsupported" };
  }

  const commandName = interaction.data?.name;
  const command = findCommand(commands, commandName);

  if (!command) {
    return { handled: false, reason: "unknown_command" };
  }

  const content = await command.execute(interaction);
  await interaction.reply({ content, ephemeral: true });

  return { handled: true, command: command.name };
};

module.exports = {
  handleInteraction
};
