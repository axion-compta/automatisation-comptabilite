import { writeFileSync } from 'node:fs';
import { genererCss } from './jetons.js';

writeFileSync(new URL('./jetons.css', import.meta.url), genererCss());
