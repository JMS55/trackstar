FROM node:16
WORKDIR /app
ENV NODE_ENV=production

COPY ./package*.json .
COPY ./bin ./bin

RUN npm ci --omit=dev
CMD [ "node", "./bin/server.js" ]

