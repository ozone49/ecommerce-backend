FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# Folder where payment slip images will be stored (mounted as a volume too)
RUN mkdir -p /app/uploads

EXPOSE 5000

CMD ["node", "src/server.js"]
