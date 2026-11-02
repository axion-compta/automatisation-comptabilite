import { writeFileSync } from 'node:fs';
import { genererCss } from './jetons.ts';

writeFileSync(new URL('./jetons.css', import.meta.url), genererCss());
