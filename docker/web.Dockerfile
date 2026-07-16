FROM node:24-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PNPM_HOME=/home/node/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV CI=true

RUN corepack enable
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /app /home/node/.local/share/pnpm /app/storage/sources /app/storage/outputs \
  && chown -R node:node /app /home/node/.local

USER node

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node apps/worker/package.json apps/worker/package.json
COPY --chown=node:node apps/web/package.json apps/web/package.json
COPY --chown=node:node packages/config/package.json packages/config/package.json
COPY --chown=node:node packages/conversions/package.json packages/conversions/package.json
COPY --chown=node:node packages/database/package.json packages/database/package.json
COPY --chown=node:node packages/pdf-engine/package.json packages/pdf-engine/package.json
COPY --chown=node:node packages/queue/package.json packages/queue/package.json
COPY --chown=node:node packages/storage/package.json packages/storage/package.json
RUN pnpm install --frozen-lockfile --prod=false

COPY --chown=node:node . .
RUN ./node_modules/.bin/prisma generate --schema packages/database/prisma/schema.prisma
RUN apps/web/node_modules/.bin/next build apps/web

CMD ["apps/web/node_modules/.bin/next", "start", "apps/web", "-H", "0.0.0.0", "-p", "3000"]
