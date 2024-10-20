# Use a node image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json yarn.lock ./
RUN yarn install

# Copy the rest of the backend code
COPY . .

# Expose the port the backend runs on (default 3000)
EXPOSE 3000

# Command to run the backend
CMD ["yarn", "start"]
