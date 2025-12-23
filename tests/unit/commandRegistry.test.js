const test = require("node:test");
const assert = require("node:assert/strict");
const { buildCommandPayloads, findCommand } = require("../../src/core/commandRegistry");

const sampleCommands = [
  { name: "ping", description: "Ping", execute: () => "Pong" },
  { name: "echo", description: "Echo", execute: () => "Echo" }
];

test("buildCommandPayloads strips execution details", () => {
  const payloads = buildCommandPayloads(sampleCommands);

  assert.deepEqual(payloads, [
    { name: "ping", description: "Ping" },
    { name: "echo", description: "Echo" }
  ]);
});

test("findCommand returns matching command", () => {
  const found = findCommand(sampleCommands, "echo");

  assert.equal(found.name, "echo");
});

test("findCommand returns null when missing", () => {
  const found = findCommand(sampleCommands, "missing");

  assert.equal(found, null);
});
