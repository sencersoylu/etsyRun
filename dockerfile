FROM node:12.16.0-stretch-slim

USER node

RUN mkdir /home/node/code

WORKDIR /home/node/code

COPY --chown=node:node package*.json  ./

RUN npm ci

COPY --chown=node:node . .

EXPOSE 4000

CMD [ "npm", "start" ]
