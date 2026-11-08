import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { centimes, formater, ajouter } from '../../../noyau/src/argent/index.js';
import { DemandeExport } from '../domaines/exports.js';
import { catalogueExportable } from '../exports/catalogue.js';
import { contrat } from '../routes.js';
import { creerServiceExports, empreinteSha256, exporterListe, ErreurExport, LIMITES_EXPORT, type SourceExport } from '../domaines/exports-service.js';
import { creerServicePlan } from '../domaines/plan-service.js';
import { creerServiceTiers } from '../domaines/tiers-service.js';
import { EnTeteEcriture } from '../schemas.js';

const BOM = String.fromCodePoint(0xfeff);
const CLE = 'cle-fictive-1';
const decoder = (b64: string): Uint8Array => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const texte = (b64: string): string => new TextDecoder('utf-8', { ignoreBOM: true }).decode(decoder(b64));
const lignesCsv = (b64: string): string[] => texte(b64).replace(new RegExp('^' + BOM), '').split('\r\n').slice(0, -1);
const cellules = (l: string): string[] => l.split(';').map((c) => c.replace(/^"|"$/g, ''));
const code = async (p: Promise<unknown>): Promise<string> => p.then(() => 'aucune', (e: unknown) => (e instanceof ErreurExport ? e.code : 'autre'));
const forge = (total: number): Record<string, SourceExport> => ({ listerTiers: { code: 'tiers', filtres: [], lister: () => ({ body: [], total }) } });

describe('contrat exports : service en mémoire', () => {
  it('csv-memes-lignes-que-la-liste', async () => {
    const attendu = creerServiceTiers().lister({ type: 'client' }).body;
    const r = await creerServiceExports().exporter(CLE, { liste: 'listerTiers', format: 'csv', filtres: { type: 'client' } });
    expect(r.body.nom).toBe('tiers_societe-fictive_2026-10-15.csv');
    expect(r.body.nbLignes).toBe(attendu.length);
    const l = lignesCsv(r.body.octetsBase64);
    expect(l).toHaveLength(attendu.length + 1);
    expect(cellules(l[0]!)).toEqual(['code', 'nom', 'type', 'email']);
    attendu.forEach((t, i) => expect(cellules(l[i + 1]!)).toEqual([t.code, t.nom, t.type, t.email]));
  });

  it('xlsx-memes-lignes-que-la-liste', async () => {
    const attendu = creerServiceTiers().lister().body;
    const r = await creerServiceExports().exporter(CLE, { liste: 'listerTiers', format: 'xlsx' });
    const octets = decoder(r.body.octetsBase64);
    expect(String.fromCharCode(octets[0]!, octets[1]!)).toBe('PK');
    expect(r.body.nom.endsWith('.xlsx')).toBe(true);
    expect(r.body.nbLignes).toBe(attendu.length);
    expect(r.body.typeContenu).toContain('spreadsheetml.sheet');
    const liste = catalogueExportable(contrat).find((l) => l.code === 'listerTiers')!;
    const feuille = exporterListe(liste, 'xlsx', attendu, { code: 'tiers', jour: '2026-10-15' }).parties!['xl/worksheets/sheet1.xml']!;
    const rangees = feuille.split('<row ').slice(1).map((x) => [...x.matchAll(/<t xml:space="preserve">(.*?)<\/t>/g)].map((m) => m[1]!.replace(/&amp;/g, '&')));
    expect(rangees).toHaveLength(attendu.length + 1);
    attendu.forEach((t, i) => expect(rangees[i + 1]).toEqual([t.code, t.nom, t.type, t.email]));
  });

  it('filtre-applique', async () => {
    const s = creerServiceExports();
    const tout = await s.exporter(CLE, { liste: 'listerTiers', format: 'csv' });
    const filtre = await s.exporter(CLE, { liste: 'listerTiers', format: 'csv', filtres: { type: 'fournisseur' } });
    expect(filtre.body.nbLignes).toBe(creerServiceTiers().lister({ type: 'fournisseur' }).total);
    expect(filtre.body.nbLignes).toBeLessThan(tout.body.nbLignes);
    expect(lignesCsv(filtre.body.octetsBase64).slice(1).every((l) => cellules(l)[2] === 'fournisseur')).toBe(true);
    for (const filtres of [{ inconnu: 'x' }, { type: 'autre' }, { limite: 1 }]) expect(await code(s.exporter(CLE, { liste: 'listerTiers', format: 'csv', filtres }))).toBe('filtre_invalide');
    expect(await code(s.exporter(CLE, { liste: 'listerTiers', format: 'csv', tri: 'nom' }))).toBe('filtre_invalide');
  });

  it('total-egal-a-la-somme-au-centime', async () => {
    const lignes = creerServicePlan().plan('EX2026')!.body;
    const somme = lignes.reduce((s, l) => ajouter(s, centimes(l.soldeCentimes)), centimes(0));
    const r = await creerServiceExports().exporter(CLE, { liste: 'listerPlan', format: 'csv' });
    const l = lignesCsv(r.body.octetsBase64);
    expect(r.body.nbLignes).toBe(lignes.length);
    expect(l).toHaveLength(lignes.length + 2);
    const total = cellules(l.at(-1)!);
    expect(total).toContain('total_lignes_filtrees');
    expect(total).toContain(formater(somme));
  });

  it('liste-vide-total-zero', async () => {
    const r = await creerServiceExports().exporter(CLE, { liste: 'listerPlan', format: 'csv', filtres: { q: 'zzzzzz' } });
    const l = lignesCsv(r.body.octetsBase64);
    expect(r.body.nbLignes).toBe(0);
    expect(l).toHaveLength(2);
    expect(cellules(l[0]!)).toEqual(['numero', 'libelle', 'classe', 'soldeCentimes']);
    expect(cellules(l[1]!)).toEqual(['total_lignes_filtrees', '', '', '0,00']);
  });

  it('societe-id-dans-le-corps-400', () => {
    const ok = { liste: 'listerTiers', format: 'csv' };
    expect(DemandeExport.safeParse(ok).success).toBe(true);
    for (const extra of [{ societe_id: 'soc-fictive' }, { autre: 1 }]) expect(DemandeExport.safeParse({ ...ok, ...extra }).success).toBe(false);
    expect(DemandeExport.safeParse({ ...ok, format: 'pdf' }).success).toBe(false);
  });

  it('liste-inconnue-404', async () => {
    const s = creerServiceExports();
    for (const liste of ['inconnue', 'lireCompteurs', 'listerFrais']) expect(await code(s.exporter(CLE, { liste, format: 'csv' }))).toBe('liste_non_exportable');
  });

  it('trop-gros-413', async () => {
    const s = creerServiceExports({ sources: forge(LIMITES_EXPORT.maximum + 1) });
    expect(await code(s.exporter(CLE, { liste: 'listerTiers', format: 'csv' }))).toBe('export_trop_gros');
    const limite = creerServiceExports({ sources: forge(LIMITES_EXPORT.maximum) });
    expect(await code(limite.exporter(CLE, { liste: 'listerTiers', format: 'csv' }))).toBe('export_en_tache_a_venir');
  });

  it('au-dela-du-direct-501', async () => {
    const dessus = creerServiceExports({ sources: forge(LIMITES_EXPORT.direct + 1) });
    expect(await code(dessus.exporter(CLE, { liste: 'listerTiers', format: 'xlsx' }))).toBe('export_en_tache_a_venir');
    const direct = creerServiceExports({ sources: forge(LIMITES_EXPORT.direct) });
    expect(await code(direct.exporter(CLE, { liste: 'listerTiers', format: 'csv' }))).toBe('aucune');
  });

  it('sans-idempotency-key-400', async () => {
    expect(EnTeteEcriture.safeParse({}).success).toBe(false);
    expect(EnTeteEcriture.safeParse({ 'idempotency-key': 'court' }).success).toBe(false);
    const s = creerServiceExports();
    const a = await s.exporter(CLE, { liste: 'listerTiers', format: 'csv' });
    expect(await s.exporter(CLE, { liste: 'listerTiers', format: 'csv' })).toEqual(a);
  });

  it('empreinte-sha256-du-fichier', async () => {
    const r = await creerServiceExports().exporter(CLE, { liste: 'listerTiers', format: 'csv' });
    const octets = decoder(r.body.octetsBase64);
    expect(r.body.empreinte).toBe(createHash('sha256').update(octets).digest('hex'));
    expect(await empreinteSha256(octets)).toBe(r.body.empreinte);
    expect(await empreinteSha256(new Uint8Array([1]))).not.toBe(r.body.empreinte);
    expect(r.body.empreinte).toMatch(/^[0-9a-f]{64}$/);
  });
});
