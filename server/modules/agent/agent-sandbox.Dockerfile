FROM node:22-bookworm

ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@11.1.3 --activate
COPY . /workspace
RUN pnpm install --frozen-lockfile
RUN pnpm --filter e2e exec playwright install --with-deps chromium
COPY server/modules/agent/agent-sandbox-runner.mjs /agent-sandbox-runner.mjs
COPY server/modules/agent/draft-run.mjs /agent-draft-run.mjs
