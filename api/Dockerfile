FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

# Create assets directory for generated maps
RUN mkdir -p /app/assets/maps

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev"]
