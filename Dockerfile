FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 80
EXPOSE 6061
CMD ["npm", "start"]