FROM node:20-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g npm@11.7.0

COPY package.json tsconfig.base.json ./
COPY packages ./packages
COPY services/api ./services/api

RUN npm install --workspaces --include-workspace-root
RUN npm run -w @discord-stack/shared build \
  && npm run -w @discord-stack/api build

CMD ["npm", "run", "-w", "@discord-stack/api", "start"]
