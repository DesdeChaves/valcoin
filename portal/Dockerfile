# Stage 1: Build the React application
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-maxtimeout 600000 && \
    npm install --legacy-peer-deps

# Copy source files
COPY . .

# Build the React app for root path
ENV PUBLIC_URL=/
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React app
COPY --from=builder /app/build /usr/share/nginx/html

# Verify files were copied
RUN echo "📦 Listing /usr/share/nginx/html:" && \
    ls -la /usr/share/nginx/html && \
    echo "📦 Listing /usr/share/nginx/html/static:" && \
    ls -la /usr/share/nginx/html/static || echo "⚠️ No static folder"

# Add healthcheck
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
