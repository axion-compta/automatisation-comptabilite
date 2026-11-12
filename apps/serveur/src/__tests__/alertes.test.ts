import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const lire = async (url: string) => {
  const a = creerApp();
  apps.push(a);
  return a.inject({ method: 'GET', url });
};
const AL = '/exercices/EX2026/alertes';

describe('serveur : alertes et compteurs', () => {
  it('filtre-etat-invalide-400', async () => {
    for (const q of ['?etat=inconnu', '?limite=0', '?limite=101', '?decalage=-1', '?x=1']) expect((await lire(`${AL}${q}`)).statusCode).toBe(400);
    expect((await lire(`${AL}?etat=ouverte`)).statusCode).toBe(200);
  });

  it('serveur-repond-aux-alertes', async () => {
    const r = await lire(`${AL}?etat=ouverte&limite=2`);
    expect(r.statusCode).toBe(200);
    const j = r.json();
    expect(j.body.map((a: { regle: string }) => a.regle)).toEqual(['ALR-01', 'ALR-05']);
    expect(j.total).toBe(5);
    expect((await lire('/exercices/EX1999/alertes')).json().code).toBe('EXERCICE_INCONNU');
  });

  it('serveur-repond-aux-compteurs', async () => {
    const r = await lire('/exercices/EX2026/compteurs');
    expect(r.statusCode).toBe(200);
    const { parEntree, alertesDuJour } = r.json().body;
    expect(parEntree.declarations).toEqual({ ouvertes: 2, urgentes: 2, pointExclamation: true });
    expect(alertesDuJour.cartes).toHaveLength(3);
    expect(alertesDuJour.urgentesTotal).toBe(5);
    const inconnu = await lire('/exercices/EX1999/compteurs');
    expect(inconnu.statusCode).toBe(404);
    expect(inconnu.json().code).toBe('EXERCICE_INCONNU');
  });
});
