FROM google/cloud-sdk:alpine

WORKDIR /usr/app

COPY . .

RUN apk update && apk add nodejs npm
RUN npm install @google-cloud/datastore @google-cloud/connect-datastore express express-session ejs mariadb node-trello short-uuid
RUN gsutil cp gs://squawkstorage/secrets.json secrets.json

CMD [ "node", "bugs.js"]
