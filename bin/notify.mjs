#!/usr/bin/env node
// Posts one ops message to Matrix. Used by the workflows and loop.sh.
//   node bin/notify.mjs <room> <info|warn|error> <message...>
// Silent no-op without MATRIX_HOMESERVER/MATRIX_BOT_TOKEN; never fails the caller.
import {matrixNotify} from '../src/matrix-notify.mjs';

const [room = 'kaz-ops', level = 'info', ...words] = process.argv.slice(2);
process.env.MATRIX_SERVICE ||= 'bracco-lines';
await matrixNotify(room, words.join(' '), {level});
