FROM node:16

WORKDIR /usr/app

COPY . .

RUN npm install discord.js express ejs mariadb node-trello short-uuid

CMD [ "node", "bugs.js"]
