FROM google/cloud-sdk:alpine

WORKDIR /usr/app

COPY . .

RUN apk update && apk add nodejs nodejs-npm
RUN npm install discord.js express express-session ejs mariadb node-trello redis connect-redis short-uuid
RUN gsutil cp gs://squawkstorage/secrets.json secrets.json

CMD [ "node", "bugs.js"]
