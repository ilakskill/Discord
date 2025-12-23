const { findCommand } = require("../core/commandRegistry");

const handleInteraction = async (interaction, commands) => {
  const isChatInputCommand = interaction?.isChatInputCommand
    ? interaction.isChatInputCommand()
    : interaction?.type === "APPLICATION_COMMAND";

  if (!interaction || !isChatInputCommand) {
    return { handled: false, reason: "unsupported" };
  }

  const commandName = interaction.commandName ?? interaction.data?.name;
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
