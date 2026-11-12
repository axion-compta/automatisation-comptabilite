import { describe, expect, it } from 'vitest';
import { pagesPubliques } from '../pages-publiques.js';

const garde = (await import(new URL('../../../../../outils/gardes/textes.mjs', import.meta.url).href)) as { MOTS_INTERDITS: string[] };

function textes(v: unknown): string[] {
  if (typeof v === 'string') return [v];
  return v && typeof v === 'object' ? Object.values(v).flatMap(textes) : [];
}

describe('pages publiques (textes)', () => {
  it('pied-courriel-liens-et-mots', () => {
    expect(pagesPubliques.piedCourriel).toContain('{lien}/informations#confidentialite');
    expect(pagesPubliques.piedCourriel).toContain('{lien}/informations#droits');
    const tous = textes(pagesPubliques);
    expect(tous.length).toBeGreaterThan(20);
    const interdits = [...garde.MOTS_INTERDITS, ['aucune donnée ne ', 'sort'].join(''), ['respecte le ', 'RG', 'PD'].join('')];
    for (const texte of tous) for (const mot of interdits) expect(texte.toLowerCase()).not.toContain(mot.toLowerCase());
  });
});
