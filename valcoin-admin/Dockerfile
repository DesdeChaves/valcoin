# Use an official Node.js runtime as a parent image
FROM node:22-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package*.json ./

# Install app dependencies
RUN npm config set registry https://registry.npmjs.org/
RUN npm config set fetch-retry-maxtimeout 600000
RUN npm install --only=production

# Bundle app source
COPY . .

# Create a non-root user for security
RUN addgroup --gid 1001 nodejs && adduser --uid 1001 --gid 1001 --disabled-password --gecos "" appuser
USER appuser

# Your app binds to port 3001, so expose it
EXPOSE 3001

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Define the command to run your app
CMD [ "node", "valcoin_server.js" ]
