import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  GARDE_MS, cleExport, creerServiceExportsFichiers, creerStockageMemoire, empreinteFiltres,
  type Acteur, type EntreeJournal,
} from '../domaines/exports-fichiers.js';
import type { AccesExpert } from '../domaines/isolation-interface.js';

const OCTETS = new TextEncoder().encode('code;nom\r\nC1;Cliente fictive\r\n');
const FILTRES = { type: 'client', texte: 'Dupuis Fictif' };
const compta: Acteur = { personneId: 'p-alice', societeId: 's-1', roles: ['gestionnaire'], permissions: ['compta-lire', 'compta-exporter'] };
const expert: Acteur = { personneId: 'p-expert', societeId: 's-1', roles: ['invite_externe'], permissions: ['compta-lire', 'compta-exporter'] };

function monde(acces: AccesExpert | null = { etat: 'actif', perimetre: ['journaux'] }) {
  let t = 1_000_000;
  const journal: EntreeJournal[] = [];
  let ids = 0;
  const etat = { acces };
  const stockage = creerStockageMemoire();
  const service = creerServiceExportsFichiers({
    stockage, journal: { ajouter: async (e) => { journal.push(e); } },
    experts: { lire: async () => etat.acces }, maintenantMs: () => t, identifiant: () => `exp-${++ids}`,
  });
  const demande = { liste: 'listerEcritures', perimetre: 'journaux' as const, filtres: FILTRES, produire: async () => ({ octets: OCTETS, nbLignes: 1 }) };
  return { service, journal, stockage, etat, demande, avancer: (ms: number) => { t += ms; } };
}

describe('exports en tâche : téléchargement revérifié', () => {
  it('202 à la demande, puis fichier servi avec les trois en-têtes de protection', async () => {
    const { service, demande } = monde();
    const r = await service.demander(compta, demande);
    expect(r.statut).toBe(202);
    expect(r.corps).toEqual({ code: 'accepte', id: 'exp-1' });
    expect((await service.etat(compta, 'exp-1')).statut).toBe(200);
    const d = await service.telecharger(compta, 'exp-1');
    expect(d.statut).toBe(200);
    expect(d.corps).toEqual(OCTETS);
    expect(d.entetes).toEqual({ 'Cache-Control': 'no-store', 'Content-Disposition': 'attachment', 'X-Content-Type-Options': 'nosniff' });
  });

  it('clé de stockage compta/<societe>/exports/<id>', async () => {
    const { service, stockage, demande } = monde();
    await service.demander(compta, demande);
    expect(cleExport('s-1', 'exp-1')).toBe('compta/s-1/exports/exp-1');
    expect(await stockage.lire('compta/s-1/exports/exp-1')).not.toBeNull();
  });

  it('expert révoqué refusé au téléchargement (403), même avec un fichier déjà prêt', async () => {
    const m = monde();
    await m.service.demander(expert, m.demande);
    expect((await m.service.telecharger(expert, 'exp-1')).statut).toBe(200);
    m.etat.acces = { etat: 'revoque', perimetre: ['journaux'] };
    const r = await m.service.telecharger(expert, 'exp-1');
    expect(r.statut).toBe(403);
    expect(r.corps).not.toBeInstanceOf(Uint8Array);
  });

  it('expert expiré, absent ou hors périmètre : 403', async () => {
    const m = monde();
    await m.service.demander(expert, m.demande);
    for (const acces of [{ etat: 'expire', perimetre: ['journaux'] }, null, { etat: 'actif', perimetre: ['exercices'] }] as Array<AccesExpert | null>) {
      m.etat.acces = acces;
      expect((await m.service.telecharger(expert, 'exp-1')).statut).toBe(403);
    }
  });

  it('permission compta-exporter retirée : 403', async () => {
    const m = monde();
    await m.service.demander(compta, m.demande);
    const lecture: Acteur = { ...compta, permissions: ['compta-lire'] };
    expect((await m.service.telecharger(lecture, 'exp-1')).statut).toBe(403);
    expect((await m.service.demander(lecture, m.demande)).statut).toBe(403);
  });

  it("fichier d'une autre personne ou d'une autre société : 404", async () => {
    const m = monde();
    await m.service.demander(compta, m.demande);
    const autre: Acteur = { ...compta, personneId: 'p-bob' };
    const ailleurs: Acteur = { ...compta, societeId: 's-2' };
    for (const a of [autre, ailleurs]) {
      expect((await m.service.telecharger(a, 'exp-1')).statut).toBe(404);
      expect((await m.service.etat(a, 'exp-1')).statut).toBe(404);
    }
    expect((await m.service.telecharger(compta, 'inconnu')).statut).toBe(404);
  });

  it('fichier expiré : 410, jamais servi, même sans passage de la tâche de marquage', async () => {
    const m = monde();
    await m.service.demander(compta, m.demande);
    m.avancer(GARDE_MS - 1);
    expect((await m.service.telecharger(compta, 'exp-1')).statut).toBe(200);
    m.avancer(1);
    const r = await m.service.telecharger(compta, 'exp-1');
    expect(r.statut).toBe(410);
    expect(r.corps).not.toBeInstanceOf(Uint8Array);
    expect((await m.service.etat(compta, 'exp-1')).statut).toBe(410);
  });

  it("l'expiration marque le fichier une seule fois et il reste refusé", async () => {
    const m = monde();
    await m.service.demander(compta, m.demande);
    expect(await m.service.expirer()).toBe(0);
    m.avancer(GARDE_MS);
    expect(await m.service.expirer()).toBe(1);
    expect(await m.service.expirer()).toBe(0);
    expect((await m.stockage.lire('compta/s-1/exports/exp-1'))?.marqueExpire).toBe(true);
    expect((await m.service.telecharger(compta, 'exp-1')).statut).toBe(410);
  });

  it('journal : qui, liste, empreinte des filtres (jamais le texte), lignes, empreinte du fichier', async () => {
    const m = monde();
    await m.service.demander(compta, m.demande);
    await m.service.telecharger(compta, 'exp-1');
    const attendu = { qui: 'p-alice', liste: 'listerEcritures', nbLignes: 1, empreinteFiltres: empreinteFiltres(FILTRES), empreinteFichier: createHash('sha256').update(OCTETS).digest('hex') };
    expect(m.journal.map((e) => e.evenement)).toEqual(['export_cree', 'export_telecharge']);
    for (const e of m.journal) expect(e).toMatchObject(attendu);
    expect(JSON.stringify(m.journal)).not.toContain('Dupuis');
    expect(empreinteFiltres({ texte: 'Dupuis Fictif', type: 'client' })).toBe(empreinteFiltres(FILTRES));
  });

  it('un refus est journalisé avec son code', async () => {
    const m = monde();
    await m.service.demander(expert, m.demande);
    m.etat.acces = { etat: 'revoque', perimetre: ['journaux'] };
    await m.service.telecharger(expert, 'exp-1');
    expect(m.journal.at(-1)).toMatchObject({ evenement: 'export_refuse', code: 403, qui: 'p-expert' });
  });

  it("l'empreinte des filtres survit à un autre service sur le même stockage", async () => {
    const m = monde();
    await m.service.demander(compta, m.demande);
    const j2: EntreeJournal[] = [];
    const autre = creerServiceExportsFichiers({ stockage: m.stockage, journal: { ajouter: async (e) => { j2.push(e); } }, experts: { lire: async () => null }, maintenantMs: () => 1_000_000 });
    await autre.telecharger(compta, 'exp-1');
    expect(j2[0]).toMatchObject({ evenement: 'export_telecharge', empreinteFiltres: empreinteFiltres(FILTRES) });
  });

  it('expert révoqué ou hors périmètre : la demande est refusée sans rien produire ni stocker', async () => {
    const m = monde({ etat: 'revoque', perimetre: ['journaux'] });
    let appels = 0;
    const demande = { ...m.demande, produire: async () => { appels += 1; return { octets: OCTETS, nbLignes: 1 }; } };
    expect((await m.service.demander(expert, demande)).statut).toBe(403);
    m.etat.acces = { etat: 'actif', perimetre: ['exercices'] };
    expect((await m.service.demander(expert, demande)).statut).toBe(403);
    expect(appels).toBe(0);
    expect(await m.stockage.lister()).toEqual([]);
  });

  it("l'état d'une tâche est refusé (403) à un expert révoqué", async () => {
    const m = monde();
    await m.service.demander(expert, m.demande);
    m.etat.acces = { etat: 'revoque', perimetre: ['journaux'] };
    expect((await m.service.etat(expert, 'exp-1')).statut).toBe(403);
  });
});
