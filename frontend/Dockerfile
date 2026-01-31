FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps
RUN npm install --legacy-peer-deps

# Copy all files
COPY . .

EXPOSE 3000

# Dev mode
CMD ["npm", "run", "dev"]
