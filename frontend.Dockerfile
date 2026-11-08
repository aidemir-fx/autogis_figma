FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

# Vite embeds VITE_* variables into the static frontend at build time.
# Keep the map key out of the Docker build context and pass it explicitly
# from docker-compose/.env instead.
ARG VITE_YMAPS_API_KEY
ENV VITE_YMAPS_API_KEY=${VITE_YMAPS_API_KEY}

RUN npm run build

FROM nginx:1.27-alpine

RUN apk add --no-cache wget

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1
