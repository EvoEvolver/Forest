# Use Node.js 20 as the base image
FROM node:20

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY packages/*/package.json ./packages/*/

# Install dependencies
RUN pnpm install

# Copy the rest of the application files
COPY . .

# Create forest directory
RUN mkdir -p forest

# Make build.sh executable and run it
RUN pnpm run build

# Set the working directory to the final application
WORKDIR /app/forest

# Expose default Node.js port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]