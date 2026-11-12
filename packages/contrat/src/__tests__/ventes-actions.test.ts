import { describe, expect, it } from 'vitest';
import { genererVentes } from '../../../donnees-fictives/src/ventes.js';
import { genererOpenapiLot, routesEcritureSansEnTete } from '../openapi.js';
import { CorpsCorrection } from '../domaines/ventes-actions.js';
import { creerServiceVentesActions, ErreurActions } from '../domaines/ventes-actions-service.js';

const DELAI = 5_000;
const T0 = 1_000_000;
const PROPOSEE = 'VP-1-009';
const A_RELIRE = 'VP-1-001';
const clef = (n: number) => `cle-fictive-${n}`;

function creer(sansClient?: string) {
  const jeu = genererVentes();
  if (sansClient) for (const s of jeu.societes) for (const p of s.pieces) if (p.id === sansClient) delete p.clientCode;
  return creerServiceVentesActions(jeu, { delaiAnnulationMs: DELAI, maintenant: () => T0 });
}
const code = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurActions ? [e.code, e.motif] : 'autre';
  }
  return 'aucune';
};

describe('actions sur les ventes (service en mémoire)', () => {
  it('correction-change-la-version', () => {
    const s = creer();
    const a = s.corriger(PROPOSEE, { dateOperation: '2026-01-15' }, 1, 'p', clef(1));
    expect(a).toMatchObject({ id: PROPOSEE, version: 2, dateOperation: '2026-01-15' });
    const b = s.corriger(PROPOSEE, { clientCode: 'CLI001', natures: [{ ligne: 0, nature: 'service' }] }, 2, 'p', clef(2));
    expect(b).toMatchObject({ version: 3, clientCode: 'CLI001', dateOperation: '2026-01-15', natures: [{ ligne: 0, nature: 'service' }] });
    expect(code(() => s.corriger(PROPOSEE, { clientCode: 'CLI999' }, 3, 'p', clef(3)))).toEqual(['ENTREE_INVALIDE', undefined]);
    expect(code(() => s.corriger(PROPOSEE, { natures: [{ ligne: 99, nature: 'service' }] }, 3, 'p', clef(4)))).toEqual(['ENTREE_INVALIDE', undefined]);
    expect(code(() => s.corriger(PROPOSEE, { factureOrigineId: PROPOSEE }, 3, 'p', clef(5)))).toEqual(['ENTREE_INVALIDE', undefined]);
    expect(code(() => s.corriger('VP-9-999', { dateOperation: '2026-01-15' }, 1, 'p', clef(6)))).toEqual(['VENTE_INCONNUE', undefined]);
  });

  it('if-match-perime-412', () => {
    const s = creer();
    s.corriger(PROPOSEE, { dateOperation: '2026-01-15' }, 1, 'p', clef(1));
    expect(code(() => s.corriger(PROPOSEE, { dateOperation: '2026-01-16' }, 1, 'p', clef(2)))).toEqual(['VERSION_PERIMEE', undefined]);
    expect(code(() => s.valider(PROPOSEE, 1, 'p', clef(3)))).toEqual(['VERSION_PERIMEE', undefined]);
    expect(s.lireVersion(PROPOSEE)).toBe(2);
  });

  it('idempotence-meme-reponse', () => {
    const s = creer();
    const a = s.corriger(PROPOSEE, { dateOperation: '2026-01-15' }, 1, 'p', clef(1));
    const b = s.corriger(PROPOSEE, { dateOperation: '2026-01-15' }, 1, 'p', clef(1));
    expect(b).toEqual(a);
    expect(s.lireVersion(PROPOSEE)).toBe(2);
    const v = s.valider(PROPOSEE, 2, 'p', clef(2));
    expect(s.valider(PROPOSEE, 2, 'p', clef(2))).toEqual(v);
    expect(s.lireVersion(PROPOSEE)).toBe(3);
  });

  it('meme-cle-autre-corps-409', () => {
    const s = creer();
    s.corriger(PROPOSEE, { dateOperation: '2026-01-15' }, 1, 'p', clef(1));
    expect(code(() => s.corriger(PROPOSEE, { dateOperation: '2026-01-16' }, 1, 'p', clef(1)))).toEqual(['CLE_REUTILISEE', undefined]);
    expect(code(() => s.valider(PROPOSEE, 2, 'p', clef(1)))).toEqual(['CLE_REUTILISEE', undefined]);
    expect(s.lireVersion(PROPOSEE)).toBe(2);
  });

  it('cle-absente-400', () => {
        expect(routesEcritureSansEnTete()).toEqual([]);
    const ops = (genererOpenapiLot('10') as { paths: Record<string, { post?: { parameters?: { name: string; required: boolean }[] } }> }).paths;
    for (const chemin of ['/corrections', '/valider'].map((x) => `/api/compta/v1/societes/{s}/ventes/{id}${x}`)) {
      expect(ops[chemin]).toBeDefined();
      const noms = (ops[chemin]?.post?.parameters ?? []).filter((p) => p.required).map((p) => p.name.toLowerCase());
      expect(noms).toEqual(expect.arrayContaining(['idempotency-key', 'if-match']));
    }
  });

  it('validation-sans-client-409', () => {
    const s = creer(PROPOSEE);
    expect(code(() => s.valider(PROPOSEE, 1, 'p', clef(1)))).toEqual(['VALIDATION_REFUSEE', 'client_absent']);
    s.corriger(PROPOSEE, { clientCode: 'CLI001' }, 1, 'p', clef(2));
    expect(s.valider(PROPOSEE, 2, 'p', clef(3)).ecriture.statut).toBe('valide');
  });

  it('validation-a-relire-409', () => {
    const s = creer();
    expect(code(() => s.valider(A_RELIRE, 1, 'p', clef(1)))).toEqual(['VALIDATION_REFUSEE', 'a_relire']);
    expect(code(() => s.valider('VP-1-029', 1, 'p', clef(2)))).toEqual(['VALIDATION_REFUSEE', 'doublon']);
    expect(code(() => s.valider('VP-1-003', 1, 'p', clef(3)))).toEqual(['VALIDATION_REFUSEE', 'ecriture_non_proposee']);
    expect(s.lireVersion(A_RELIRE)).toBe(1);
  });

  it('validation-acceptee-annulable', () => {
    const s = creer();
    expect(s.valider(PROPOSEE, 1, 'p', clef(1))).toEqual({ id: PROPOSEE, version: 2, ecriture: { statut: 'valide' }, annulableJusqua: T0 + DELAI });
    expect(code(() => s.valider(PROPOSEE, 2, 'p', clef(2)))).toEqual(['VALIDATION_REFUSEE', 'ecriture_non_proposee']);
  });

  it('corps-vide-400', () => {
    for (const corps of [{}, { clientCode: undefined }, { natures: [] }, { dateOperation: '2026-13-40' }, { natures: [{ ligne: -1, nature: 'x' }] }, { natures: [{ ligne: 1.5, nature: 'x' }] }, { clientCode: '' }]) {
      expect(CorpsCorrection.safeParse(corps).success).toBe(false);
    }
    expect(CorpsCorrection.safeParse({ clientCode: 'CLI001' }).success).toBe(true);
  });
});
