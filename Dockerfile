# ---- Stage 1: Build ----
FROM node:18-alpine AS builder

WORKDIR /app

# Copy workspace root (package.json + yarn workspace config)
COPY workspace/package.json workspace/

# Copy package.json for each workspace package (for dependency caching)
COPY workspace/packages/common/package.json workspace/packages/common/
COPY workspace/packages/client/package.json workspace/packages/client/
COPY workspace/packages/ext-tour/package.json workspace/packages/ext-tour/

# Install dependencies
WORKDIR /app/workspace
RUN yarn install --network-timeout 120000

# Copy all source code
WORKDIR /app
COPY workspace/ workspace/

# Build environment: "staging" or "prod" (must match a key in packages/env.json)
ARG BUILD_ENV=fideltour

# Build common library first (client depends on it)
WORKDIR /app/workspace/packages/common
RUN yarn build

# Build client
WORKDIR /app/workspace/packages/client
RUN yarn build-${BUILD_ENV}

# ---- Stage 2: Serve with nginx ----
FROM nginx:alpine

COPY --from=builder /app/workspace/packages/client/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
