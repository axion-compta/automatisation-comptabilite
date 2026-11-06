import { demarrer } from './index.js';

const port = Number(process.env['PORT'] ?? 3001);
await demarrer(port);
console.log('serveur en mémoire sur http://127.0.0.1:' + port);
