FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm config set registry https://registry.npmjs.org/
RUN npm config set fetch-retry-maxtimeout 600000
RUN npm install

COPY . .

EXPOSE 3001

CMD [ "npm", "start" ]
