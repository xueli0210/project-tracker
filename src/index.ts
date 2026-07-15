#!/usr/bin/env node
import { run } from './cli.js';
import { dataFilePath } from './config.js';
import { JsonStore } from './store/jsonStore.js';

const store = new JsonStore(dataFilePath());

run(process.argv.slice(2), store)
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
