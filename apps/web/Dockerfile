FROM node:20-alpine

WORKDIR /app

# Copy the full monorepo so pnpm can resolve the workspace package without extra Docker plumbing.
COPY . /app

RUN corepack enable && pnpm install

WORKDIR /app/apps/web

CMD ["pnpm", "dev", "--hostname", "0.0.0.0", "--port", "3000"]

