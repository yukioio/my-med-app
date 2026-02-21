FROM node:24-slim AS base
# pnpmを使えるように設定を共通化
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
# frozen-lockfileでローカルと完全に同じバージョンをインストール
RUN pnpm i --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# ここを npm から pnpm に変更！
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# Next.js の standalone モード用のコピー
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 8080
ENV PORT 8080
CMD ["node", "server.js"]