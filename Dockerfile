FROM node:20-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci


FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_API_PATH_PREFIX=api
ARG NEXT_PUBLIC_MATCHES_API_BASE_URL
ARG NEXT_PUBLIC_MATCHES_API_PATH
ARG NEXT_PUBLIC_LIVE_SOCKET_URL

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_PATH_PREFIX=$NEXT_PUBLIC_API_PATH_PREFIX
ENV NEXT_PUBLIC_MATCHES_API_BASE_URL=$NEXT_PUBLIC_MATCHES_API_BASE_URL
ENV NEXT_PUBLIC_MATCHES_API_PATH=$NEXT_PUBLIC_MATCHES_API_PATH
ENV NEXT_PUBLIC_LIVE_SOCKET_URL=$NEXT_PUBLIC_LIVE_SOCKET_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build


FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
