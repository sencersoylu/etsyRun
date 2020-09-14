FROM node:12.16.0-stretch


RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-unstable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*


USER node

RUN mkdir /home/node/code

WORKDIR /home/node/code

COPY --chown=node:node package*.json  ./

RUN npm ci

COPY --chown=node:node . .

EXPOSE 5000

CMD [ "npm", "start" ]

