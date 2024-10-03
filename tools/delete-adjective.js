const Compromise = require('compromise');
const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');

// https://nodejs.org/en/learn/command-line/accept-input-from-the-command-line-in-nodejs
const readline = require('node:readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Adjective: ', async (adjective) => {
  await Database.query('DELETE FROM adjectives WHERE adjective = ?', [adjective]);

  process.exit(0);
});