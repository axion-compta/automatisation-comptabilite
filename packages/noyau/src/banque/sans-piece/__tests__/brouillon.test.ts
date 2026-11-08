import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import * as module from '../brouillon.js';
import { ErreurBrouillon, preparerBrouillon, type RedacteurBrouillon } from '../brouillon.js';
import type { DemandeSuivie } from '../reponses.js';

const c = centimes;
// Clé « 00 » : jamais une clé juste, donc aucun IBAN valide.
const IBAN = 'FR00 1234 5678 9012 3456 7890 123';
const demande = (ligneIds: string[], o: Partial<DemandeSuivie> = {}): DemandeSuivie => ({
  cle: 'c:cp-a|piece_attendue', ligneIds, impact: c(0), nombre: ligneIds.length, type: 'piece_attendue', codeQuestion: 'factures_manquantes',
  reponsesPretes: ['je_les_depose', 'ou_les_trouver', 'pas_de_facture', 'c_est_personnel'], etat: 'repondue', reponse: 'ou_les_trouver', ...o,
});
const lignes = [
  { id: 'l1', date: '2026-02-03', montant: c(-123456), libelle: `PRLV ATELIER FICTIF ${IBAN} Jeanne Exemple` },
  { id: 'l2', date: '2026-03-04', montant: c(-5), libelle: 'PRLV ATELIER FICTIF' },
  { id: 'l3', date: '2026-03-05', montant: c(100000), libelle: 'AUTRE' },
];
const base = { fournisseur: { nom: 'Atelier Fictif', domaines: ['atelier-fictif.exemple.fr'] as readonly string[] }, lignes, personnes: ['Jeanne Exemple'] };
const faux = (texte = 'Bonjour, pourriez-vous nous renvoyer les factures suivantes ?', espaceClient?: string) => {
  const entrees: Parameters<RedacteurBrouillon>[0][] = [];
  const rediger: RedacteurBrouillon = async (e) => {
    entrees.push(e);
    return espaceClient === undefined ? { texte } : { texte, espaceClient };
  };
  return { entrees, rediger };
};
const code = async (p: Promise<unknown>): Promise<string | undefined> => {
  try {
    await p;
  } catch (e) {
    return e instanceof ErreurBrouillon ? e.code : 'autre';
  }
  return undefined;
};

describe('brouillon', () => {
  it('brouillon-cite-chaque-piece-et-montant', async () => {
    const f = faux();
    const b = await preparerBrouillon(demande(['l1', 'l2']), { ...base, rediger: f.rediger });
    expect(b.source).toBe('ia');
    expect(b.corps).toContain('Bonjour, pourriez-vous');
    expect(b.corps).toContain('2026-02-03');
    expect(b.corps).toContain('1234,56');
    expect(b.corps).toContain('2026-03-04');
    expect(b.corps).toContain('0,05');
    expect(b.corps).not.toContain('-1234');
    expect(b.pieces).toEqual([{ date: '2026-02-03', montant: c(123456) }, { date: '2026-03-04', montant: c(5) }]);
    const seule = await preparerBrouillon(demande(['l3']), { ...base, rediger: f.rediger });
    expect(seule.pieces).toEqual([{ date: '2026-03-05', montant: c(100000) }]);
    expect(seule.corps).toContain('1000,00');
    expect(b.objet).not.toBe('');
  });
  it('jamais-envoye', async () => {
    const b = await preparerBrouillon(demande(['l1']), { ...base, rediger: faux().rediger });
    expect(b.etat).toBe('brouillon');
    expect(b.envoye).toBe(false);
  });
  it('aucun-export-d-envoi', () => {
    expect(Object.keys(module).filter((k) => /envoi|envoy|send|post|mail/i.test(k))).toEqual([]);
    expect(Object.keys(module).sort()).toEqual(['ErreurBrouillon', 'preparerBrouillon']);
  });
  it('aucun-iban-ni-nom-vers-l-ia', async () => {
    const f = faux('Bonjour [PERSONNE_1], voici [IBAN_1]');
    const b = await preparerBrouillon(demande(['l1', 'l2']), { ...base, fournisseur: { ...base.fournisseur, nom: 'Jeanne Exemple' }, rediger: f.rediger });
    const vu = JSON.stringify(f.entrees);
    expect(f.entrees).toHaveLength(1);
    for (const interdit of [IBAN, IBAN.replace(/ /g, ''), 'Jeanne', 'Exemple', '1234 5678']) expect(vu).not.toContain(interdit);
    expect(vu).toContain('[IBAN_1]');
    expect(vu).toContain('[PERSONNE_1]');
    expect(b.corps).toContain('Bonjour Jeanne Exemple, voici ' + IBAN);
    expect(b.corps).not.toMatch(/\[(IBAN|CARTE|PERSONNE)_\d+\]/);
  });
  it('montant-invente-texte-de-repli', async () => {
    for (const texte of ['Merci de régler 999,99 € restants', 'Total 1 234,56 plus 77,70', 'Il manque 12 euros', 'Reste 1.000,00', 'Jeton [PERSONNE_9] non rétabli']) {
      const b = await preparerBrouillon(demande(['l1', 'l2']), { ...base, rediger: faux(texte).rediger });
      expect(b.source, texte).toBe('modele');
      expect(b.corps).not.toContain(texte);
      expect(b.corps).toContain('1234,56');
    }
    const ok = await preparerBrouillon(demande(['l1', 'l2']), { ...base, rediger: faux('Montants : 1234,56 € et 0,05 €, soit 1 234,56 € au total.').rediger });
    expect(ok.source).toBe('ia');
  });
  it('redacteur-en-panne-texte-de-repli', async () => {
    const pannes: RedacteurBrouillon[] = [async () => Promise.reject(new Error('panne')), () => { throw new Error('panne'); }, async () => ({ texte: '' }), async () => ({}) as { texte: string }];
    for (const rediger of pannes) {
      const b = await preparerBrouillon(demande(['l1']), { ...base, rediger });
      expect(b.source).toBe('modele');
      expect(b.etat).toBe('brouillon');
      expect(b.corps).toContain('1234,56');
    }
  });
  it('espace-client-hors-domaine-retire', async () => {
    const garde = async (u: string | undefined) => (await preparerBrouillon(demande(['l1']), { ...base, rediger: faux('Bonjour', u).rediger })).espaceClient;
    expect(await garde('https://atelier-fictif.exemple.fr/compte')).toBe('https://atelier-fictif.exemple.fr/compte');
    expect(await garde('https://client.atelier-fictif.exemple.fr/')).toBe('https://client.atelier-fictif.exemple.fr/');
    expect(await garde('https://atelier-fictif.exemple.fr.piege.test/')).toBeUndefined();
    expect(await garde('https://autre-atelier-fictif.exemple.fr/')).toBeUndefined();
    expect(await garde(`https://atelier-fictif.exemple.fr${String.fromCharCode(64)}piege.test/`)).toBeUndefined();
    expect(await garde('https://piege.test/')).toBeUndefined();
    expect(await garde('https://')).toBeUndefined();
    expect(await garde('pas une url')).toBeUndefined();
    expect(await garde(undefined)).toBeUndefined();
    const b = await preparerBrouillon(demande(['l1']), { ...base, rediger: faux('Bonjour', 'https://piege.test/').rediger });
    expect('espaceClient' in b).toBe(false);
  });
  it('espace-client-http-retire', async () => {
    for (const u of ['http://atelier-fictif.exemple.fr/', 'javascript:alert(1)', 'ftp://atelier-fictif.exemple.fr/', '//atelier-fictif.exemple.fr/']) {
      const b = await preparerBrouillon(demande(['l1']), { ...base, rediger: faux('Bonjour', u).rediger });
      expect(b.espaceClient, u).toBeUndefined();
    }
  });
  it('demande-non-concernee-refusee', async () => {
    for (const o of [{ reponse: 'je_les_depose' as const }, { reponse: undefined } as unknown as Partial<DemandeSuivie>]) {
      expect(await code(preparerBrouillon(demande(['l1'], o), { ...base, rediger: faux().rediger }))).toBe('demande_non_concernee');
    }
  });
  it('ligne-inconnue-refusee', async () => {
    const f = faux();
    expect(await code(preparerBrouillon(demande(['l1', 'inconnue']), { ...base, rediger: f.rediger }))).toBe('ligne_inconnue');
    expect(await code(preparerBrouillon(demande(['l1']), { ...base, lignes: [{ ...lignes[0]!, montant: Number.NaN as ReturnType<typeof c> }], rediger: f.rediger }))).toBe('montant_invalide');
    expect(f.entrees).toHaveLength(0);
  });
  it('entree-jamais-modifiee', async () => {
    const d = demande(['l1', 'l2']);
    const avant = JSON.stringify([d, base]);
    await preparerBrouillon(d, { ...base, rediger: faux().rediger });
    expect(JSON.stringify([d, base])).toBe(avant);
  });
});
