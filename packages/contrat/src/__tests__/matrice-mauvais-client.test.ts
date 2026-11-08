// Fiche L13-T50 : matrice « mauvais client ». Sociétés, identifiants et octets fictifs ; cible en mémoire, aucun réseau.
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { OUTILS } from '../chat/outils.js';
import { catalogueExportable } from '../exports/catalogue.js';
import {
  ErreurMatrice,
  TACHES_PLANIFIEES,
  elementsSansCas,
  genererMatrice,
  tachesNonDeclarees,
  verifierCas,
  type CasMauvaisClient,
  type CibleEtanche,
  type Societe,
} from '../matrice-mauvais-client.js';
import { genererOpenapi } from '../openapi.js';
import { contrat } from '../routes.js';

const A: Societe = { societeId: 'soc-123456782', objetId: 'obj-a-1', octets: ['Dupont-Fictif-A', 'IBAN-FICTIF-A'] };
const B: Societe = { societeId: 'soc-987654324', objetId: 'obj-b-1', octets: ['Martin-Fictif-B'] };
const INTROUVABLE = '{"code":"introuvable"}';

type Variante = { statut?: number; corpsExistant?: string; fuite?: boolean; journal?: 'ok' | 'vide' | 'au-nom-de-a' };
/** Cible en mémoire : étanche par défaut, variantes fuyantes forgées. */
function cible(v: Variante = {}): CibleEtanche {
  return {
    appeler: async (_cas, session, objetId) => {
      const etranger = objetId === A.objetId && session.societeId !== A.societeId;
      if (!etranger) return { statut: 404, corps: INTROUVABLE, journal: [] };
      const proprietaire = v.journal === 'au-nom-de-a' ? A.societeId : session.societeId;
      return {
        statut: v.statut ?? 404,
        corps: (v.corpsExistant ?? INTROUVABLE) + (v.fuite ? A.octets[0] : ''),
        journal: v.journal === 'vide' ? [] : [{ code: 'refus_acces', societeId: proprietaire }],
      };
    },
  };
}

const doc = genererOpenapi();
const matrice = genererMatrice(doc, OUTILS, catalogueExportable(contrat), TACHES_PLANIFIEES);
const dossierTaches = fileURLToPath(new URL('../../../../apps/serveur/src/taches/', import.meta.url));
const unCas: CasMauvaisClient = matrice[0] as CasMauvaisClient;

function attendus(): string[] {
  const paths = (doc as { paths: Record<string, Record<string, { operationId: string }>> }).paths;
  return [
    ...Object.values(paths).flatMap((ops) => Object.values(ops).map((o) => 'route:' + o.operationId)),
    ...OUTILS.map((o) => 'outil:' + o.nom),
    ...catalogueExportable(contrat).map((e) => 'export:' + e.code),
    ...TACHES_PLANIFIEES.map((t) => 'tache:' + t),
  ];
}

describe('matrice mauvais client', () => {
  it('matrice-couvre-tout-le-contrat', () => {
    const att = attendus();
    expect(matrice.length).toBeGreaterThan(0);
    expect(att.length).toBeGreaterThan(0);
    expect(elementsSansCas(att, matrice)).toEqual([]);
    expect(matrice).toHaveLength(att.length);
    expect(new Set(matrice.map((c) => c.genre))).toEqual(new Set(['route', 'outil', 'export', 'tache']));
  });

  it('element-retire-rouge', () => {
    const retire = matrice.filter((c) => !(c.genre === 'outil' && c.code === OUTILS[0]?.nom));
    expect(elementsSansCas(attendus(), retire)).toEqual(['outil:' + OUTILS[0]?.nom]);
    expect(elementsSansCas(attendus(), [])).toHaveLength(attendus().length);
  });

  it('tache-non-declaree-rouge', () => {
    const fichiers = readdirSync(dossierTaches);
    expect(fichiers.some((f) => f.endsWith('.ts'))).toBe(true);
    expect(tachesNonDeclarees(fichiers, TACHES_PLANIFIEES)).toEqual([]);
    expect(tachesNonDeclarees([...fichiers, 'nouvelle-tache.ts', 'autre.test.ts'], TACHES_PLANIFIEES)).toEqual(['nouvelle-tache']);
  });

  it('cible-etanche-verte', async () => {
    for (const cas of matrice) expect(await verifierCas(cible(), cas, A, B)).toEqual([]);
  });

  it('reponse-403-rouge', async () => {
    expect(await verifierCas(cible({ statut: 403 }), unCas, A, B)).toContain('statut_non_404');
  });

  it('corps-qui-trahit-l-existence-rouge', async () => {
    const e = await verifierCas(cible({ corpsExistant: '{"code":"introuvablE"}' }), unCas, A, B);
    expect(e).toEqual(['corps_different_d_un_inexistant']);
  });

  it('octet-de-a-rouge', async () => {
    expect(await verifierCas(cible({ fuite: true }), unCas, A, B)).toContain('fuite_d_octets_de_a');
  });

  it('refus-non-journalise-rouge', async () => {
    expect(await verifierCas(cible({ journal: 'vide' }), unCas, A, B)).toEqual(['refus_acces_absent']);
    expect(await verifierCas(cible({ journal: 'au-nom-de-a' }), unCas, A, B)).toEqual(['refus_acces_absent']);
  });

  it('doublon-et-document-vide', () => {
    expect(() => genererMatrice({}, [{ nom: 'x' }, { nom: 'x' }], [], [])).toThrow(ErreurMatrice);
    expect(() => genererMatrice({}, [], [{ code: 'e' }], ['e'])).not.toThrow();
    expect(() => genererMatrice({}, [], [], ['e', 'e'])).toThrow(ErreurMatrice);
    expect(() => genererMatrice({}, [], [{ code: 'e' }, { code: 'e' }], [])).toThrow(/doublon/);
    expect(genererMatrice({}, [], [], [])).toEqual([]);
    expect(genererMatrice({ paths: {} }, [], [], [])).toEqual([]);
  });
});
