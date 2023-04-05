FROM node:lts-alpine
RUN apk add dumb-init

WORKDIR /app
COPY . .
#COPY --chown=node:node . .
RUN npm install
RUN npm run build

RUN mkdir "uploads"

COPY src/config/*.json /app/dist/src/config/

#USER node

CMD ["dumb-init", "node", "dist/src/app.js"]

