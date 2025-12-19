# Use Playwright base image
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Install Playwright browsers (already in base image, but ensure latest)
RUN npx playwright install chromium

# Set environment variables
ENV NODE_ENV=production

# Run the test script
CMD ["node", "run-tests.js"]

