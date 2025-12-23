const test = require("node:test");
const assert = require("node:assert/strict");
const { commands } = require("../../src/core/commands");
const { handleInteraction } = require("../../src/handlers/interactionHandler");

test("happy path: ping command replies", async () => {
  const replies = [];
  const interaction = {
    isChatInputCommand: () => true,
    commandName: "ping",
    reply: async (payload) => {
      replies.push(payload);
    }
  };

  const result = await handleInteraction(interaction, commands);

  assert.deepEqual(result, { handled: true, command: "ping" });
  assert.equal(replies.length, 1);
  assert.deepEqual(replies[0], { content: "Pong!", ephemeral: true });
});
