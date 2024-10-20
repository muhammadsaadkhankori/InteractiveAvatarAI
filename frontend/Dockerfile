# Use a node image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json yarn.lock ./
RUN yarn install

# Copy the rest of the frontend code
COPY . .

# Expose the port the frontend runs on (default 5173 for Vite)
EXPOSE 5173

# Command to run the frontend
CMD ["yarn", "dev"]
