FROM mcr.microsoft.com/playwright:v1.61.1-jammy

WORKDIR /app

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PNPM_HOME=/home/pwuser/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV CI=true

RUN corepack enable
RUN mkdir -p /app /home/pwuser/.local/share/pnpm /app/storage/sources /app/storage/outputs \
  && chown -R pwuser:pwuser /app /home/pwuser/.local

USER pwuser

COPY --chown=pwuser:pwuser package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=pwuser:pwuser apps/worker/package.json apps/worker/package.json
COPY --chown=pwuser:pwuser apps/web/package.json apps/web/package.json
COPY --chown=pwuser:pwuser packages/config/package.json packages/config/package.json
COPY --chown=pwuser:pwuser packages/conversions/package.json packages/conversions/package.json
COPY --chown=pwuser:pwuser packages/database/package.json packages/database/package.json
COPY --chown=pwuser:pwuser packages/pdf-engine/package.json packages/pdf-engine/package.json
COPY --chown=pwuser:pwuser packages/queue/package.json packages/queue/package.json
COPY --chown=pwuser:pwuser packages/storage/package.json packages/storage/package.json
RUN pnpm install --frozen-lockfile --prod=false

COPY --chown=pwuser:pwuser . .
RUN ./node_modules/.bin/prisma generate --schema packages/database/prisma/schema.prisma

CMD ["apps/worker/node_modules/.bin/tsx", "apps/worker/src/index.ts"]
