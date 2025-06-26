# Use Node.js 20 as the base image
FROM node:20

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy the rest of the application files
COPY . .

# Install dependencies
RUN pnpm install

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