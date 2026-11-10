import { describe, expect, it } from 'vitest';
import {
  ErreurArchiveRapport, verifierArchive, type DocumentRapport, type EntreeArchive,
} from '../../../../../packages/noyau/src/juridique/archive-rapport.js';
import {
  ErreurArchiveRapports, apercuRapport, archiverRapport,
  type DependancesArchive, type PortArchive, type PortRenduPdf,
} from '../archive-rapports.js';

// Société fictive SIREN 987654324 ; personnes inventées.
const demande = { type: 'gestion', exerciceId: 'ex-987654324-2026', rubriques: [{ code: 'activite', texte: 'Texte fictif' }] } as const;
const VALIDATION = { par: 'Camille Exemple', le: '2027-03-10' };

function montage(opts: { valide?: boolean; leve?: boolean } = {}) {
  const ecrits: { entree: EntreeArchive; octets: Uint8Array }[] = [];
  const stock = new Map<string, EntreeArchive>();
  let variante = '';
  const rendu: PortRenduPdf = {
    rendre: async (doc: DocumentRapport) => {
      if (opts.leve === true) throw new Error('rendu en panne');
      return new TextEncoder().encode(JSON.stringify(doc) + variante);
    },
  };
  const archive: PortArchive = {
    lire: async (nom) => stock.get(nom),
    ecrire: async (entree, octets) => {
      stock.set(entree.nom, entree);
      ecrits.push({ entree, octets });
    },
  };
  const deps: DependancesArchive = {
    rendu,
    archive,
    validations: { lire: () => (opts.valide === false ? null : VALIDATION) },
    aujourdhui: () => '2027-03-11',
  };
  return { deps, ecrits, changer: (v: string) => (variante = v) };
}

describe('archive des rapports (serveur)', () => {
  it('apercu-n-ecrit-rien', async () => {
    const m = montage();
    expect(JSON.parse(new TextDecoder().decode(await apercuRapport(m.deps, demande)))).toMatchObject({ filigrane: 'a_valider' });
    expect(m.ecrits).toHaveLength(0);
  });

  it('archive-apres-validation', async () => {
    const m = montage();
    const e = await archiverRapport(m.deps, demande);
    expect(m.ecrits.map((x) => x.entree)).toEqual([e]);
    const ecrit = m.ecrits[0];
    expect(e).toMatchObject({ par: 'Camille Exemple', archiveLe: '2027-03-11' });
    expect(JSON.parse(new TextDecoder().decode(ecrit?.octets))).toMatchObject({ filigrane: 'aucun' });
    expect(verifierArchive(ecrit?.octets ?? new Uint8Array(0), e).ok).toBe(true);
  });

  it('archive-refusee-sans-validation', async () => {
    const m = montage({ valide: false });
    await expect(archiverRapport(m.deps, demande)).rejects.toBeInstanceOf(ErreurArchiveRapport);
    expect(m.ecrits).toHaveLength(0);
  });

  it('relance-memes-octets-idempotente', async () => {
    const m = montage();
    const premiere = await archiverRapport(m.deps, demande);
    const seconde = await archiverRapport(m.deps, demande);
    expect(seconde).toEqual(premiere);
    expect(m.ecrits).toHaveLength(1);
  });

  it('octets-differents-jamais-ecrases', async () => {
    const m = montage();
    const premiere = await archiverRapport(m.deps, demande);
    m.changer(' rendu modifié');
    await expect(archiverRapport(m.deps, demande)).rejects.toBeInstanceOf(ErreurArchiveRapports);
    expect(m.ecrits.map((x) => x.entree)).toEqual([premiere]);
  });

  it('rendu-qui-leve-n-ecrit-rien', async () => {
    const m = montage({ leve: true });
    await expect(archiverRapport(m.deps, demande)).rejects.toThrow('rendu en panne');
    expect(m.ecrits).toHaveLength(0);
  });
});
