# Discord

A minimal Discord slash-command bot starter that demonstrates command registration,
interaction handling, and a small test suite.

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a `.env` file** (see [Environment variables](#environment-variables)).

3. **Register slash commands**

   ```bash
   npm run register
   ```

4. **Start the bot**

   ```bash
   npm start
   ```

> Prefer `make`? See [Common tasks](#common-tasks).

## Docker setup

Follow these steps to run the full stack with Docker Compose.

1. **Install Docker + Compose**

   ```bash
   docker --version
   docker compose version
   ```

2. **Create a `.env` file** with at least your bot token:

   ```bash
   # create the file (if it doesn't exist)
   touch .env

   DISCORD_TOKEN=your-bot-token
   ```

   > On Windows PowerShell, use:
   >
   > ```powershell
   > New-Item -Path .env -ItemType File -Force
   > $env:DISCORD_TOKEN="your-bot-token"
   > ```

3. **Build and start the stack**

   ```bash
   docker compose up --build
   ```

4. **Verify containers are running**

   ```bash
   docker compose ps
   ```

### Optional edge proxy profile

To run the optional nginx/caddy edge containers:

```bash
docker compose --profile edge up --build
```

## Environment variables

Create a `.env` file (or export variables in your shell) with the following keys.
The app uses `dotenv` to load `.env` automatically.

| Variable | Required | Description |
| --- | --- | --- |
| `DISCORD_TOKEN` | ✅ | Bot token from the Discord Developer Portal. |
| `DISCORD_APPLICATION_ID` | ✅ | Application (client) ID for your Discord app. |
| `DISCORD_GUILD_ID` | Optional | Development server (guild) ID for faster slash-command registration. |

Example:

```bash
DISCORD_TOKEN=your-bot-token
DISCORD_APPLICATION_ID=your-application-id
DISCORD_GUILD_ID=your-development-guild-id
```

## Discord app setup

1. **Create an application** in the [Discord Developer Portal](https://discord.com/developers/applications).
2. **Add a bot** to the application.
3. **Copy the bot token** and set it as `DISCORD_TOKEN`.
4. **Copy the application ID** (General Information) and set it as `DISCORD_APPLICATION_ID`.
5. **Generate an invite URL**:
   - Go to **OAuth2 → URL Generator**.
   - Select the scopes **`bot`** and **`applications.commands`**.
   - Choose the permissions listed in [Permissions](#permissions).
   - Use the generated URL to invite the bot to your server.

## Permissions

Minimum recommended permissions for this bot:

- **Send Messages** (for responding to commands)
- **Use Slash Commands**

If you need additional functionality later (e.g., embeds, reactions), add those
permissions when regenerating the invite URL.

## Slash command registration

Slash commands must be registered before they appear in Discord.

- **Guild (development) registration** is fast and recommended during
  development. Set `DISCORD_GUILD_ID` and run:

  ```bash
  npm run register
  ```

- **Global registration** is slower to propagate (can take up to an hour). Omit
  `DISCORD_GUILD_ID` and run the same command:

  ```bash
  npm run register
  ```

## Common tasks

| Task | Command |
| --- | --- |
| Install dependencies | `npm install` or `make install` |
| Register commands | `npm run register` or `make register` |
| Start the bot | `npm start` or `make start` |
| Run lint | `npm run lint` or `make lint` |
| Run all tests | `npm test` or `make test` |
| Run unit tests | `npm run test:unit` or `make test-unit` |
| Run e2e tests | `npm run test:e2e` or `make test-e2e` |
