# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy frontend dependencies
COPY package.json bun.lockb ./
RUN npm install

# Copy frontend source and config files
COPY src ./src
COPY public ./public
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY components.json eslint.config.js postcss.config.js tailwind.config.ts ./

# Build frontend
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Install server dependencies
COPY server/package.json server/package-lock.json* ./
RUN npm install

# Copy server source
COPY server/src ./src
COPY server/tsconfig.json ./

# Copy built frontend from builder
COPY --from=frontend-builder /app/dist ./dist

# Create uploads directory
RUN mkdir -p ./uploads

# Environment variables
ENV SERVER_PORT=3005
ENV DB_HOST=31.97.177.87
ENV DB_PORT=3307
ENV DB_USER=root
ENV DB_PASSWORD=StrongPass123
ENV DB_NAME=emoloye
ENV JWT_SECRET=change-this-secret-key
ENV NODE_ENV=production

# Expose ports
EXPOSE 3005 8087

# Start server
CMD ["npm", "start"]
