import "dotenv/config";
import express from "express";
import { formatHealth } from "@discord-stack/shared";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.get("/health", (_req, res) => {
  res.json(formatHealth());
});

app.listen(port, () => {
  console.log(`API listening on ${port}`);
});
