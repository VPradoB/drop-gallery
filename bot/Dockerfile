FROM node:20-alpine

# sharp requires build tools on alpine
RUN apk add --no-cache vips-dev fftw-dev build-base python3

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/

ENV NODE_ENV=production
ENV MEDIA_PATH=/app/public/media

RUN mkdir -p /app/public/media

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD node -e "process.exit(0)" || exit 1

CMD ["node", "src/index.js"]
