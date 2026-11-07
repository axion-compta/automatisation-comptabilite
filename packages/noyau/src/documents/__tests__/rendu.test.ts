import { describe, expect, it } from 'vitest';
import { etatMention } from '../mention.js';
import { ErreurRendu, FAMILLES_DOCUMENT, paquetSansZoneLibre, rendreDocument } from '../rendu.js';

const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurRendu ? e.code : 'autre';
  }
  return undefined;
};
const BROUILLON = etatMention({ statut: 'brouillon', nature: 'officiel' });
const VALIDE = etatMention({
  statut: 'valide',
  nature: 'officiel',
  validePar: 'Camille Fictif',
  valideLe: '2026-03-01',
});
const octets = (...n: number[]) => new Uint8Array(n);

describe('rendu', () => {
  it('dix-familles-exactement', () => {
    expect([...FAMILLES_DOCUMENT]).toEqual([
      'bilan',
      'compte_resultat',
      'annexe',
      'balance',
      'grand_livre',
      'journaux',
      'declaration_preparee',
      'pv',
      'etat_rapprochement',
      'rapport_controles',
    ]);
    for (const famille of FAMILLES_DOCUMENT) {
      expect(rendreDocument({ famille, corps: 'x', mention: BROUILLON }).famille).toBe(famille);
    }
  });

  it('mention-en-tete-et-en-pied', () => {
    const r = rendreDocument({ famille: 'bilan', corps: 'contenu', mention: BROUILLON });
    expect(r.entete).toEqual({ mention: 'prepare_par_ia' });
    expect(r.pied.mention).toBe('prepare_par_ia');
    expect(r.corps).toBe('contenu');
  });

  it('validateur-dans-le-pied', () => {
    const sans = rendreDocument({ famille: 'pv', corps: '', mention: BROUILLON });
    expect('validation' in sans.pied).toBe(false);
    const avec = rendreDocument({ famille: 'pv', corps: '', mention: VALIDE });
    expect(avec.pied.validation).toEqual({ par: 'Camille Fictif', le: '2026-03-01' });
  });

  it('famille-inconnue-refusee', () => {
    for (const f of ['', 'Bilan', 'facture', 'constructor', '__proto__']) {
      expect(code(() => rendreDocument({ famille: f as never, corps: '', mention: BROUILLON }))).toBe(
        'famille_inconnue',
      );
    }
  });

  it('fec-octets-intacts-et-compagnon', () => {
    const fichiers = [
      { nom: 'fec.txt', contenu: octets(0, 255, 10, 13) },
      { nom: 'b.csv', contenu: octets() },
    ];
    for (const format of ['fec', 'csv'] as const) {
      const p = paquetSansZoneLibre({ format, fichiers, mention: VALIDE });
      expect(p.fichiers).toHaveLength(2);
      expect(p.fichiers.map((f) => [f.nom, [...f.contenu]])).toEqual([
        ['fec.txt', [0, 255, 10, 13]],
        ['b.csv', []],
      ]);
      expect(p.compagnon).toEqual({ nom: 'LISEZMOI.txt', mention: VALIDE });
      expect(p.manifeste).toEqual({ mention: VALIDE });
    }
    expect(code(() => paquetSansZoneLibre({ format: 'fec', fichiers: [], mention: VALIDE }))).toBe(
      'paquet_vide',
    );
  });

  it('collision-lisezmoi-refusee', () => {
    for (const nom of ['lisezmoi.TXT', 'LISEZMOI.txt']) {
      const fichiers = [{ nom: 'a.csv', contenu: octets(1) }, { nom, contenu: octets(2) }];
      expect(code(() => paquetSansZoneLibre({ format: 'csv', fichiers, mention: VALIDE }))).toBe(
        'collision_compagnon',
      );
    }
    const ok = [{ nom: 'lisezmoi.txt.csv', contenu: octets(1) }];
    expect(code(() => paquetSansZoneLibre({ format: 'csv', fichiers: ok, mention: VALIDE }))).toBe(
      undefined,
    );
  });

  it('filigrane-repris-de-la-mention', () => {
    const cas = [
      etatMention({ statut: 'brouillon', nature: 'indicatif' }),
      etatMention({ statut: 'brouillon', nature: 'travail' }),
      BROUILLON,
      VALIDE,
    ];
    expect(cas.map((mention) => rendreDocument({ famille: 'annexe', corps: '', mention }).filigrane)).toEqual([
      'indicatif',
      'non_officiel',
      'a_valider',
      'aucun',
    ]);
  });
});
