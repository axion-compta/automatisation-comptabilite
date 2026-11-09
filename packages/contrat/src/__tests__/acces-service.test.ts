import { describe, expect, it } from 'vitest';
import { Acces } from '../domaines/acces.js';
import { creerServiceAcces } from '../domaines/acces-service.js';

const horloge = () => '2026-11-09T10:00:00Z';
const lire = (scenario: string | null) => creerServiceAcces({ horloge, scenario }).lire();
const NON_ACTIFS: ReadonlyArray<readonly [string, string]> = [
  ['essai', 'ESSAI'], ['delai_de_grace', 'DELAI_DE_GRACE'], ['lecture_seule', 'LECTURE_SEULE'], ['suspendu', 'SUSPENDU'], ['resilie', 'RESILIE'],
];
function parcourir(j: unknown, sortie: string[] = []): string[] {
  if (Array.isArray(j)) j.forEach((x) => parcourir(x, sortie));
  else if (j !== null && typeof j === 'object') for (const [k, v] of Object.entries(j)) (sortie.push(k), parcourir(v, sortie));
  else sortie.push(String(j));
  return sortie;
}

describe('service accès', () => {
  it('actif-sans-banniere', () => {
    expect(lire('acces=actif')).toEqual({ etat: 'ACTIF', banniere: null, reprise: null });
  });

  it('cinq-etats-non-actifs-avec-banniere', () => {
    for (const [s, etat] of NON_ACTIFS) {
      const r = lire('acces=' + s);
      expect(Acces.safeParse(r).success, s).toBe(true);
      expect(r.etat).toBe(etat);
      expect(r.banniere?.cause, s).toEqual(expect.any(String));
      expect(r.banniere?.consequence, s).toEqual(expect.any(String));
    }
  });

  it('aucun-montant-dans-la-reponse', () => {
    for (const s of [null, 'acces=essai;reprise=oui', ...NON_ACTIFS.map(([n]) => 'acces=' + n)]) {
      for (const m of parcourir(lire(s))) expect(m).not.toMatch(/montant|prix|€/i);
    }
  });

  it('lien-contacter-axion-avant-branchement', () => {
    for (const [s] of NON_ACTIFS) expect(lire('acces=' + s).banniere?.lien, s).toBe('contacter_axion');
  });

  it('prochaine-etape-en-essai', () => {
    expect(lire('acces=essai').banniere?.prochaine_etape_le).toBe('2026-11-23');
    expect(lire('acces=suspendu').banniere?.prochaine_etape_le).toBe('2026-12-09');
    expect(lire('acces=lecture_seule').banniere?.prochaine_etape_le).toBeNull();
  });

  it('scenario-invalide-donne-actif', () => {
    for (const s of [null, '', 'n_importe_quoi', 'acces=inconnu', 'acces=essai;acces=actif', 'acces=essai;volume=zzz', 'acces=essai=x']) {
      expect(lire(s), String(s)).toEqual({ etat: 'ACTIF', banniere: null, reprise: null });
    }
  });

  it('reprise-resume-vingt-pieces', () => {
    expect(lire('reprise=oui').reprise).toEqual({ pieces_traitees: 20 });
    expect(lire('acces=essai;reprise=oui').reprise).toEqual({ pieces_traitees: 20 });
    expect(lire('acces=delai_de_grace;reprise=oui').reprise).toEqual({ pieces_traitees: 20 });
    expect(lire('acces=lecture_seule;reprise=oui').reprise).toBeNull();
    expect(lire('acces=suspendu;reprise=oui').reprise).toBeNull();
    expect(lire('acces=resilie;reprise=oui').reprise).toBeNull();
    expect(lire('reprise=non').reprise).toBeNull();
  });
});
