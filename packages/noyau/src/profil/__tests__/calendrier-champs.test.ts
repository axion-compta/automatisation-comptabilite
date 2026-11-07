import { describe, expect, it } from 'vitest';
import { CLES_CALENDRIER, echeancesAVerifier, statutsChampsCalendrier } from '../calendrier-champs.js';
import { ajouterValeur, marquerJeNeSaisPas } from '../champs.js';
import { ErreurProfil } from '../types.js';
import type { ChampProfil } from '../types.js';

const S = 'societe-fictive-1';
const JOUR = '2026-03-10';
const base: readonly ChampProfil[] = [];
const donne = (h: readonly ChampProfil[], cle: string, date = '2026-01-01'): readonly ChampProfil[] =>
  ajouterValeur(h, { societeId: S, cle, valeur: 'x', origine: 'saisie_personne', confiance: 'sur' }, date);
const tousConnus = CLES_CALENDRIER.reduce<readonly ChampProfil[]>((h, cle) => donne(h, cle), base);
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurProfil ? e.code : 'autre';
  }
  return undefined;
};

describe('calendrier-champs', () => {
  it('je-ne-sais-pas-marque-a-verifier', () => {
    const h = marquerJeNeSaisPas(tousConnus, { societeId: S, cle: 'vehicules' }, '2026-02-01');
    const st = statutsChampsCalendrier(h, S, JOUR);
    expect(st['vehicules']).toBe('je_ne_sais_pas');
    expect(st['locaux']).toBe('connu');
    expect(echeancesAVerifier(st, [{ echeance: 'e1', champs: ['vehicules'] }])).toEqual([{ echeance: 'e1', champs: ['vehicules'] }]);
  });

  it('absent-marque-a-verifier', () => {
    const st = statutsChampsCalendrier(base, S, JOUR);
    expect(st['effectif_moyen']).toBe('absent');
    expect(echeancesAVerifier(st, [{ echeance: 'e1', champs: ['effectif_moyen'] }])).toHaveLength(1);
  });

  it('tout-connu-rien-a-verifier', () => {
    const st = statutsChampsCalendrier(tousConnus, S, JOUR);
    expect(Object.keys(st).sort()).toEqual([...CLES_CALENDRIER].sort());
    expect(echeancesAVerifier(st, [{ echeance: 'e1', champs: [...CLES_CALENDRIER] }])).toEqual([]);
  });

  it('champs-en-cause-rendus', () => {
    const h = marquerJeNeSaisPas(donne(tousConnus, 'locaux'), { societeId: S, cle: 'ca_n_moins_1' }, '2026-02-01');
    const st = statutsChampsCalendrier(h, S, JOUR);
    const r = echeancesAVerifier(st, [{ echeance: 'e1', champs: ['locaux', 'ca_n_moins_1', 'is_n_moins_1'] }]);
    expect(r).toEqual([{ echeance: 'e1', champs: ['ca_n_moins_1'] }]);
    const st2 = statutsChampsCalendrier(base, S, JOUR);
    expect(echeancesAVerifier(st2, [{ echeance: 'e1', champs: ['surface_locaux', 'locaux', 'locaux'] }])[0]?.champs).toEqual(['locaux', 'surface_locaux']);
  });

  it('sans-doublon-et-trie', () => {
    const st = statutsChampsCalendrier(base, S, JOUR);
    const r = echeancesAVerifier(st, [
      { echeance: 'c', champs: ['vehicules'] },
      { echeance: 'a', champs: ['locaux'] },
      { echeance: 'c', champs: ['locaux'] },
      { echeance: 'b', champs: ['vehicules'] },
    ]);
    expect(r.map((x) => x.echeance)).toEqual(['a', 'b', 'c']);
    expect(r[2]?.champs).toEqual(['locaux', 'vehicules']);
  });

  it('champ-inconnu-refuse', () => {
    const st = statutsChampsCalendrier(base, S, JOUR);
    expect(code(() => echeancesAVerifier(st, [{ echeance: 'e1', champs: [''] }]))).toBe('champ_calendrier_inconnu');
    expect(code(() => echeancesAVerifier(st, [{ echeance: 'e1', champs: ['effectif'] }]))).toBe('champ_calendrier_inconnu');
    expect(code(() => echeancesAVerifier(st, [{ echeance: 'e1', champs: ['locaux', 'effectif'] }]))).toBe('champ_calendrier_inconnu');
  });

  it('lu-a-la-date', () => {
    const h = donne(base, 'vehicules', '2026-04-01');
    expect(statutsChampsCalendrier(h, S, '2026-03-31')['vehicules']).toBe('absent');
    expect(statutsChampsCalendrier(h, S, '2026-04-01')['vehicules']).toBe('connu');
    const h2 = marquerJeNeSaisPas(donne(base, 'vehicules'), { societeId: S, cle: 'vehicules' }, '2026-04-01');
    expect(statutsChampsCalendrier(h2, S, '2026-03-31')['vehicules']).toBe('connu');
    expect(statutsChampsCalendrier(h2, S, '2026-04-01')['vehicules']).toBe('je_ne_sais_pas');
    expect(code(() => statutsChampsCalendrier(h, S, 'demain'))).toBe('date_invalide');
  });
});
