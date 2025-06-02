FROM node:20

# Set working directory
WORKDIR /app

# Copy package files
COPY forest_server/package*.json forest_server/
COPY forest_client/package*.json forest_client/

# Install dependencies
RUN cd forest_server && npm install
RUN cd forest_client && npm install

# Copy source code
COPY forest_server forest_server/
COPY forest_client forest_client/

# Create forest directory
RUN mkdir -p forest

# Build applications and organize files (following build.sh logic)
RUN npm run --prefix forest_server build && \
    cp -r forest_server/dist forest && \
    npm run --prefix forest_client build && \
    cp -r forest_client/dist forest/dist && \
    mv forest/dist/dist forest/dist/public

# Set the working directory to the final application
WORKDIR /app/forest

# Expose default Node.js port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]