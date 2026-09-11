# Use node:20-alpine for a lightweight build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install

# Copy the rest of the project
COPY . .

# Build the web version
# This generates the static files in the 'dist' directory
RUN CI=1 npx expo export --platform web

# Final stage: Use a lightweight server to serve the static files
FROM node:20-alpine

WORKDIR /app

# Install 'serve' globally to serve the static directory
RUN npm install -g serve

# Copy only the built files from the builder stage
COPY --from=builder /app/dist .

# Expose the port matches the docker-compose.yml
EXPOSE 8081

# Start the server
CMD ["serve", "-s", "dist", "-p", "8081"]
