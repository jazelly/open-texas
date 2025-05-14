FROM node:22-alpine as build

WORKDIR /app

# Copy workspace configuration
COPY package*.json ./
COPY server/package*.json ./server/
COPY server/tsconfig.json ./server/
COPY server/prisma/ ./server/prisma/

# Install all dependencies using workspace
RUN npm install

# Copy server source
COPY server/src/ ./server/src/

# Generate Prisma and build
WORKDIR /app/server
RUN npm run db:generate
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

# Copy package files
COPY server/package*.json ./

# Copy prisma files - using a safer approach
COPY --from=build /app/server/prisma ./prisma

# Create node_modules directory
RUN mkdir -p node_modules

# Copy generated prisma client (fix for the error)
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma 
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Copy built files to the correct location
COPY --from=build /app/server/dist ./dist

# Install production dependencies
RUN npm install --omit=dev

RUN npx prisma generate

EXPOSE 8080
CMD ["node", "dist/server/src/index.js"]
