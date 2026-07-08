# Multi-stage build for the SPA — used for the on-prem deployment
# (docker-compose.onprem.yml in the backend repo). Does NOT affect the Vercel
# deployment, which builds straight from source via vercel.json.
#
# No VITE_API_BASE_URL build arg is needed: the app defaults to the relative
# path '/api/v1', and nginx.conf proxies '/api/' to the backend container —
# same-origin, so there's no CORS to configure for the on-prem stack either.

FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
