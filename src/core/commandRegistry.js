const buildCommandPayloads = (commandList) =>
  commandList.map((command) => ({
    name: command.name,
    description: command.description
  }));

const findCommand = (commandList, name) =>
  commandList.find((command) => command.name === name) || null;

module.exports = {
  buildCommandPayloads,
  findCommand
};
