# CospinDSG / DSG ONE production container
# Runtime boundary: this image contains app code only. Secrets must be mounted through the target runtime or Secret Manager.

FROM node:24-bookworm-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:24-bookworm-slim AS runner
ARG DSG_GIT_SHA=unknown
ARG DSG_BUILD_TIMESTAMP=unknown
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
LABEL org.opencontainers.image.revision="${DSG_GIT_SHA}"
LABEL org.opencontainers.image.created="${DSG_BUILD_TIMESTAMP}"

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/scripts/bootstrap-pro-overage.mjs ./scripts/bootstrap-pro-overage.mjs

EXPOSE 8080
CMD ["sh", "-c", "if [ \"${DSG_BOOTSTRAP_OVERAGE_ON_START:-false}\" = \"true\" ]; then node ./scripts/bootstrap-pro-overage.mjs; fi && npx next start -p ${PORT:-8080}"]
