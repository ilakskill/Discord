const test = require("node:test");
const assert = require("node:assert/strict");
const { handleInteraction } = require("../../src/handlers/interactionHandler");

const commands = [
  { name: "ping", description: "Ping", execute: () => "Pong" }
];

test("handleInteraction returns unknown_command for unsupported command", async () => {
  const interaction = {
    isChatInputCommand: () => true,
    commandName: "missing",
    reply: async () => {}
  };

  const result = await handleInteraction(interaction, commands);

  assert.deepEqual(result, { handled: false, reason: "unknown_command" });
});
