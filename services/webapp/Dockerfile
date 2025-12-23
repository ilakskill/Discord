FROM node:20-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY package.json tsconfig.base.json ./
COPY packages ./packages
COPY services/webapp ./services/webapp

RUN npm install --workspaces --include-workspace-root
RUN npm run -w @discord-stack/shared build \
  && npm run -w @discord-stack/webapp build

CMD ["npm", "run", "-w", "@discord-stack/webapp", "start"]
