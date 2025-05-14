FROM node:22-alpine as build

WORKDIR /app

# Copy workspace configuration
COPY package*.json ./
COPY client/package*.json ./client/
COPY client/tsconfig.json ./client/
COPY client/vite.config.ts ./client/
COPY client/index.html ./client/
COPY client/tailwind.config.js ./client/
COPY client/postcss.config.cjs ./client/

# Install all dependencies using workspace
RUN npm install

# Copy client source
COPY client/src/ ./client/src/

# Build the client
WORKDIR /app/client
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

# Copy built client files
COPY --from=build /app/client/dist /usr/share/nginx/html

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
