require("dotenv").config();

const required = ["DISCORD_TOKEN", "DISCORD_APPLICATION_ID"];

const loadConfig = (env = process.env) => {
  const missing = required.filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    token: env.DISCORD_TOKEN,
    applicationId: env.DISCORD_APPLICATION_ID,
    guildId: env.DISCORD_GUILD_ID || null
  };
};

module.exports = {
  loadConfig
};
