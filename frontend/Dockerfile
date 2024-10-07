# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and yarn.lock to install dependencies
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy the rest of the application files
COPY . .

# Expose the port Vite uses (default: 5173)
EXPOSE 5173

# Run Vite development server
CMD ["yarn", "run", "dev", "--host"]
