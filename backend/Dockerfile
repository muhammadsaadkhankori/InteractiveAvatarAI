# Base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy the package.json and yarn.lock files to install dependencies
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy the rest of the backend code
COPY . .

# Expose the port where your backend runs (e.g., 5000)
EXPOSE 3000

# Command to run the backend server
CMD ["yarn", "run", "dev"]
