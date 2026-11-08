import { describe, expect, it } from 'vitest';
import { ajouter, centimes, formater } from '../../../noyau/src/argent/index.js';
import type { Appeler, Cible } from './suite-contrat.js';

const BOM = String.fromCodePoint(0xfeff);
const cle = { 'idempotency-key': 'cle-fictive-1' };
const CSV = { liste: 'listerTiers', format: 'csv' };
type Export = { nom: string; typeContenu: string; octetsBase64: string; nbLignes: number; empreinte: string };

/** Suite commune « exports » : écrite une fois, jouée sur le vrai serveur et sur le faux. */
export function suiteExports(nom: string, cible: Cible): void {
  describe('suite exports commune : ' + nom, () => {
    const avec = async (f: (a: Appeler) => Promise<void>) => {
      const c = await cible();
      try {
        await f(c.appeler);
      } finally {
        await c.fermer();
      }
    };
    const texte = (b64: string) => new TextDecoder('utf-8', { ignoreBOM: true }).decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
    const exporter = async (a: Appeler, corps: unknown) => {
      const r = await a('POST', '/exports', cle, corps);
      return { r, corps: (r.json as { body: Export }).body };
    };

    it('CSV : mêmes lignes que la liste, nombre, BOM, empreinte', () =>
      avec(async (a) => {
        const liste = ((await a('GET', '/tiers?type=client')).json as { body: Array<Record<string, string>> }).body;
        const { r, corps } = await exporter(a, { ...CSV, filtres: { type: 'client' } });
        expect(r.status).toBe(200);
        const t = texte(corps.octetsBase64);
        expect(t.startsWith(BOM)).toBe(true);
        const lignes = t.slice(BOM.length).split('\r\n').slice(0, -1);
        expect(lignes.slice(1)).toEqual(liste.map((x) => `"${x['code']}";"${x['nom']}";"${x['type']}";"${x['email']}"`));
        expect(corps).toMatchObject({ nbLignes: liste.length, typeContenu: 'text/csv; charset=utf-8' });
        expect(liste.length).toBeGreaterThan(0);
        expect(corps.empreinte).toMatch(/^[0-9a-f]{64}$/);
      }));

    it('total égal à la somme des lignes au centime', () =>
      avec(async (a) => {
        const plan = ((await a('GET', '/exercices/EX2026/plan')).json as { body: Array<{ soldeCentimes: number }> }).body;
        const somme = plan.reduce((s, l) => ajouter(s, centimes(l.soldeCentimes)), centimes(0));
        const { corps } = await exporter(a, { liste: 'listerPlan', format: 'csv' });
        const lignes = texte(corps.octetsBase64).split('\r\n').slice(0, -1);
        expect(corps.nbLignes).toBe(plan.length);
        expect(lignes).toHaveLength(plan.length + 2);
        expect(lignes.at(-1)).toContain('total_lignes_filtrees');
        expect(lignes.at(-1)).toContain(formater(somme));
      }));

    it('liste vide : en-tête et total à zéro', () =>
      avec(async (a) => {
        const { r, corps } = await exporter(a, { liste: 'listerPlan', format: 'csv', filtres: { q: 'zzzzzz' } });
        expect(r.status).toBe(200);
        expect(corps.nbLignes).toBe(0);
        expect(texte(corps.octetsBase64).split('\r\n').slice(0, -1)).toHaveLength(2);
      }));

    it('XLSX : archive zip et type de contenu', () =>
      avec(async (a) => {
        const { r, corps } = await exporter(a, { ...CSV, format: 'xlsx' });
        expect(r.status).toBe(200);
        expect(corps.typeContenu).toContain('spreadsheetml');
        expect(corps.nom.endsWith('.xlsx')).toBe(true);
        expect(atob(corps.octetsBase64).startsWith('PK')).toBe(true);
      }));

    it('rejeu de la même clé : même réponse', () =>
      avec(async (a) => {
        const x = await a('POST', '/exports', cle, CSV);
        expect((await a('POST', '/exports', cle, CSV)).json).toEqual(x.json);
      }));

    it('400 : société dans le corps, champ en plus, format inconnu, clé absente, filtre inconnu', () =>
      avec(async (a) => {
        for (const corps of [{ ...CSV, societe_id: 'soc-fictive' }, { ...CSV, autre: 1 }, { ...CSV, format: 'pdf' }, { ...CSV, filtres: { inconnu: 'x' } }, { ...CSV, tri: 'nom' }])
          expect((await a('POST', '/exports', cle, corps)).status).toBe(400);
        expect((await a('POST', '/exports', {}, CSV)).status).toBe(400);
        expect((await a('POST', '/exports', { 'idempotency-key': '' }, CSV)).status).toBe(400);
      }));

    it('404 : liste non exportable', () =>
      avec(async (a) => {
        const r = await a('POST', '/exports', cle, { ...CSV, liste: 'inconnue' });
        expect(r.status).toBe(404);
        expect(r.json).toMatchObject({ code: 'LISTE_NON_EXPORTABLE', status: 404 });
      }));
  });
}
