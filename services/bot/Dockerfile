FROM node:20-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY package.json tsconfig.base.json ./
COPY packages ./packages
COPY services/bot ./services/bot

RUN npm install --workspaces --include-workspace-root
RUN npm run -w @discord-stack/shared build \
  && npm run -w @discord-stack/bot build

CMD ["npm", "run", "-w", "@discord-stack/bot", "start"]
