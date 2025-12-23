import "dotenv/config";
import express from "express";
import { formatHealth } from "@discord-stack/shared";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.get("/", (_req, res) => {
  res.send(`<html><body><h1>Discord Webapp</h1><p>Status: ${formatHealth().status}</p></body></html>`);
});

app.listen(port, () => {
  console.log(`Webapp listening on ${port}`);
});
