import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ajouterLot, teteInitiale, type Brouillon, type EntreeJournal } from '../../../../packages/noyau/src/journal/chaine.js';
import { verificateurEd25519 } from '../../../../packages/noyau/src/journal/tete-signee.js';
import { creerFauxPlanificateur } from '../../../../packages/noyau/src/exploitation/planificateur.js';
import { cheminTete, controlerAvantExport, inscrireTachesTete, signerEtDeposer, type CoffreSignature, type DepotsTete, type SourceJournal } from '../securite/tete-journal.js';

const T0 = '2026-03-01T00:00:00Z';
const MAINTENANT = '2026-03-02T10:00:00Z';
const brouillon = (i: number): Brouillon => ({
  societeId: 'A', horodatage: T0, acteur: 'marie@exemple.fr', canal: 'clic', evenement: 'ecriture.creee', motif: `saisie ${i}`, apres: { ligne: i },
});

function monde() {
  // Paire éphémère créée par le test : aucune clé réelle, rien n'est écrit sur disque.
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const verificateur = verificateurEd25519(publicKey.export({ type: 'spki', format: 'pem' }).toString());
  const etat = { coffreOuvert: true, entrees: ajouterLot(teteInitiale('A', T0), Array.from({ length: 20 }, (_, i) => brouillon(i))).entrees as EntreeJournal[] };
  const coffre: CoffreSignature = {
    async signer(document) {
      if (!etat.coffreOuvert) throw new Error('coffre_indisponible');
      return sign(null, Buffer.from(document, 'utf8'), privateKey).toString('base64');
    },
  };
  const fichiers = new Map<string, string>();
  const depots: DepotsTete = {
    async deposer(chemin, contenu) {
      if (fichiers.has(chemin)) return 'existant';
      fichiers.set(chemin, contenu);
      return 'cree';
    },
    async lire(chemin) { return fichiers.get(chemin) ?? null; },
  };
  const source: SourceJournal = {
    async societes() { return ['A']; },
    async creeLe() { return T0; },
    async entrees() { return structuredClone(etat.entrees); },
  };
  const evenements: string[] = [];
  const deps = { coffre, depots, source, verificateur, signaler: (e: string, s: string) => evenements.push(`${e}:${s}`) };
  return { etat, fichiers, deps, evenements };
}

describe('tête du journal signée', () => {
  it('tete-de-la-veille-verifiee (T-JRN-5)', async () => {
    const m = monde();
    await signerEtDeposer(m.deps, 'A', 'nuit', '2026-03-01T23:00:00Z');
    expect([...m.fichiers.keys()]).toEqual(['a_compta/journal/A/2026-03-01.json']);
    expect(await controlerAvantExport(m.deps, 'A', MAINTENANT)).toMatchObject({ autorise: true });
    // Une entrée supprimée en fin de chaîne : la tête de la veille ne correspond plus.
    m.etat.entrees.pop();
    expect(await controlerAvantExport(m.deps, 'A', MAINTENANT)).toEqual({ autorise: false, raison: 'chaine_rompue', defaut: 'fin_tronquee' });
    expect(m.evenements).toEqual(['audit.chaine_rompue:A']);
  });

  it('rupture-bloque-l-export', async () => {
    const m = monde();
    m.etat.entrees[10] = { ...m.etat.entrees[10]!, motif: 'altéré' };
    const r = await controlerAvantExport(m.deps, 'A', MAINTENANT);
    expect(r).toEqual({ autorise: false, raison: 'chaine_rompue', defaut: 'modifiee' });
    expect(m.evenements).toEqual(['audit.chaine_rompue:A']);
    expect(m.fichiers.size).toBe(0); // rien n'est signé sur une chaîne rompue
  });

  it('depot-deux-fois-un-fichier', async () => {
    const m = monde();
    const [a, b] = [await signerEtDeposer(m.deps, 'A', 'nuit', '2026-03-01T01:00:00Z'), await signerEtDeposer(m.deps, 'A', 'nuit', '2026-03-01T02:00:00Z')];
    expect([a.depot, b.depot]).toEqual(['cree', 'existant']);
    expect(m.fichiers.size).toBe(1);
    expect(JSON.parse([...m.fichiers.values()][0]!)).toMatchObject({ evenement: 'nuit', horodatage: '2026-03-01T01:00:00Z' });
  });

  it('coffre-indisponible-pas-d-export-officiel', async () => {
    const m = monde();
    m.etat.coffreOuvert = false;
    expect(await controlerAvantExport(m.deps, 'A', MAINTENANT)).toEqual({ autorise: false, raison: 'coffre_indisponible' });
    expect(m.fichiers.size).toBe(0);
  });

  it('signature-alteree-bloque-l-export', async () => {
    const m = monde();
    await signerEtDeposer(m.deps, 'A', 'nuit', '2026-03-01T23:00:00Z');
    const chemin = cheminTete('A', '2026-03-01');
    const f = JSON.parse(m.fichiers.get(chemin)!) as { tete: { sequence: number } };
    f.tete.sequence = 5;
    m.fichiers.set(chemin, JSON.stringify(f));
    expect(await controlerAvantExport(m.deps, 'A', MAINTENANT)).toMatchObject({ autorise: false, raison: 'chaine_rompue' });
  });

  it('chemin-refuse-si-societe-ou-date-douteuse', () => {
    expect(cheminTete('soc-1', '2026-03-01')).toBe('a_compta/journal/soc-1/2026-03-01.json');
    expect(() => cheminTete('../x', '2026-03-01')).toThrow();
    expect(() => cheminTete('soc-1', '2026-3-1')).toThrow();
  });

  it('tache-nocturne-signe-et-verifie-en-utc', async () => {
    const m = monde();
    const { planificateur, avancerJusqua } = creerFauxPlanificateur();
    inscrireTachesTete(planificateur, m.deps, { minuteHoraire: 5 });
    expect((await avancerJusqua('2026-03-01T03:05:00Z')).map((r) => r.etat)).toEqual(['fait', 'fait']);
    expect(m.fichiers.has('a_compta/journal/A/2026-03-01.json')).toBe(true);
    m.etat.entrees.splice(3, 1);
    await avancerJusqua('2026-03-02T03:05:00Z');
    expect(m.evenements).toContain('audit.chaine_rompue:A');
  });
});
