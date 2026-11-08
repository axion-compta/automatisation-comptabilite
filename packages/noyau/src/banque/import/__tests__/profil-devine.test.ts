import { describe, expect, it } from 'vitest';
import { fichiersDeReference } from '../../../../../donnees-fictives/src/banque-fichiers.js';
import type { LigneBrute, ProfilImport } from '../profil.js';
import { confirmer, deviner, LIGNES_APERCU, mesurer, type ProposeurProfil } from '../profil-devine.js';

const profil: ProfilImport = {
  colonnes: { date: 0, libelle: [1] }, signe: { type: 'signe', colonne: '2' }, format: { decimal: ',', milliers: '' },
  formatDate: 'JJ/MM/AAAA', deviseParDefaut: 'EUR', ligneEntete: 0,
};
const brutes = (n: number, libelle = 'VIR FICTIF'): LigneBrute[] => [
  { rang: 0, cellules: ['Date', 'Libelle', 'Montant'] },
  ...Array.from({ length: n }, (_, i) => ({ rang: i + 1, cellules: [`${String(i + 1).padStart(2, '0')}/03/2026`, `${libelle} ${i}`, '-12,50'] })),
];
const capteur = (texte: string) => {
  const vus: { entete: string[]; lignes: string[][] }[] = [];
  const proposer: ProposeurProfil = async (e) => {
    vus.push(e);
    return texte;
  };
  return { vus, proposer };
};
const lancer = (texte: string, lignes = brutes(12), personnes: string[] = []) => {
  const k = capteur(texte);
  return { k, r: deviner(lignes, { ligneEntete: 0, personnes, proposer: k.proposer }) };
};
const motif = async (texte: string) => {
  const r = await lancer(texte).r;
  return r.etat === 'a_choisir' ? r.motif : r.etat;
};

describe('profil deviné par l\'IA', () => {
  it('envoie-entete-et-dix-lignes-au-plus', async () => {
    const { k, r } = lancer(JSON.stringify(profil));
    const res = await r;
    expect(LIGNES_APERCU).toBe(10);
    expect(k.vus[0]?.entete).toEqual(['Date', 'Libelle', 'Montant']);
    expect(k.vus[0]?.lignes).toHaveLength(10);
    expect(res.etat === 'propose' && res.apercu.compteurs).toMatchObject({ lues: 10, importees: 10 });
  });

  it('fichier-de-moins-de-dix-lignes', async () => {
    const { k, r } = lancer(JSON.stringify(profil), brutes(3));
    expect((await r).etat).toBe('propose');
    expect(k.vus[0]?.lignes).toHaveLength(3);
  });

  it('aucun-iban-ni-nom-vers-le-proposeur', async () => {
    const iban = 'FR00 1234 5678 9012 3456 7890 123';
    const lignes = brutes(2);
    lignes[1] = { rang: 1, cellules: ['01/03/2026', `VIR ${iban} Jeanne Exemple`, '-1,00'] };
    lignes[2] = { rang: 2, cellules: ['02/03/2026', `CB 4974 1234 5678 1234 ${iban.replaceAll(' ', '')}`, '-2,00'] };
    lignes[0] = { rang: 0, cellules: ['Date', 'Libelle Exemple', 'Montant'] };
    const { k, r } = lancer(JSON.stringify(profil), lignes, ['Jeanne Exemple']);
    const res = await r;
    const cellules = k.vus[0]!.entete.concat(...k.vus[0]!.lignes);
    for (const cellule of cellules) for (const interdit of ['FR00', '1234', '4974', 'Jeanne']) expect(cellule).not.toContain(interdit);
    expect(cellules.join(' ')).toContain('[IBAN_1]');
    expect(res.etat === 'propose' && res.apercu.lignes[0]?.libelleBrut).toContain('Jeanne Exemple');
  });

  it('json-illisible-a-choisir', async () => {
    for (const t of ['pas du json', '', '{"colonnes":']) expect(await motif(t)).toBe('reponse_illisible');
  });

  it('colonne-hors-limite-profil-invalide', async () => {
    const avec = (colonnes: object) => JSON.stringify({ ...profil, colonnes });
    const mauvais = [
      avec({ date: 7, libelle: [1] }), avec({ date: -1, libelle: [1] }), avec({ date: 0.5, libelle: [1] }), avec({ date: 0, libelle: [] }),
      avec({ date: 0, libelle: [0] }), avec({ date: 0, libelle: [1, 1] }), avec({ date: null, libelle: [1] }), avec({ date: 0, libelle: [1], extra: 2 }),
      JSON.stringify({ ...profil, ligneEntete: 1 }), JSON.stringify({ ...profil, champEnTrop: 1 }), JSON.stringify({ ...profil, signe: { type: 'inconnu' } }),
      JSON.stringify({ ...profil, signe: { type: 'signe', colonne: '9' } }), JSON.stringify({ ...profil, formatDate: 'XX' }), '[]', 'null', '42',
    ];
    for (const t of mauvais) expect([t, await motif(t)]).toEqual([t, 'profil_invalide']);
  });

  it('proposeur-en-panne-indisponible', async () => {
    const r = await deviner(brutes(5), { ligneEntete: 0, personnes: [], proposer: async () => { throw new Error('hors service'); } });
    expect(r).toEqual({ etat: 'a_choisir', motif: 'indisponible' });
  });

  it('fichier-vide-sans-appel', async () => {
    const k = capteur(JSON.stringify(profil));
    for (const [lignes, ligneEntete] of [[[], 0], [brutes(0), 0], [brutes(4), 9]] as const) {
      expect(await deviner(lignes, { ligneEntete, personnes: [], proposer: k.proposer })).toEqual({ etat: 'a_choisir', motif: 'fichier_vide' });
    }
    expect(k.vus).toHaveLength(0);
  });

  it('ia-ne-confirme-pas', async () => {
    const p = await lancer(JSON.stringify(profil)).r;
    for (const acteur of [{ type: 'ia', id: 'modele-fictif' }, { type: 'personne', id: '' }] as const) {
      expect(() => confirmer(p, acteur)).toThrow('confirmation_reservee_a_une_personne');
    }
    expect(() => confirmer({ etat: 'a_choisir', motif: 'indisponible' }, { type: 'personne', id: 'u1' })).toThrow('rien_a_confirmer');
  });

  it('confirmation-par-une-personne', async () => {
    const entree = brutes(4);
    const copie = structuredClone(entree);
    const p = await deviner(entree, { ligneEntete: 0, personnes: [], proposer: capteur(JSON.stringify(profil)).proposer });
    expect(confirmer(p, { type: 'personne', id: 'u1' })).toEqual({ etat: 'confirme', profil, par: { type: 'personne', id: 'u1' } });
    expect(entree).toEqual(copie);
  });

  it('banc-t02-7-mesure', async () => {
    const fichiers = fichiersDeReference();
    const avecProfil = fichiers.filter((f) => f.profil !== undefined && f.texte !== undefined);
    expect(avecProfil.length).toBeGreaterThanOrEqual(4);
    const parEntete = new Map(avecProfil.map((f) => [f.texte!.split('\n')[0]!.split(/[;,]/).join('|'), f.profil!]));
    const fidele: ProposeurProfil = async (e) => JSON.stringify(parEntete.get(e.entete.join('|')));
    expect(await mesurer(fichiers, fidele)).toEqual({ justes: avecProfil.length, total: avecProfil.length });
    const faux: ProposeurProfil = async (e) => {
      const p = parEntete.get(e.entete.join('|'))!;
      return JSON.stringify(e.entete.length === 4 && e.entete[3] === 'Solde' && e.entete.length === 4 && p.colonnes.soldeCourant === 3 ? { ...p, deviseParDefaut: 'USD' } : p);
    };
    const r = await mesurer(fichiers, faux);
    expect(r.total).toBe(avecProfil.length);
    expect(r.justes).toBe(r.total - 1);
  });
});
