import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';
import { creerArretConsole, journalEnMemoire, stockageEnMemoire } from '../securite/arret-console.js';

const T0 = '2026-11-12T08:00:00.000Z';
const T1 = '2026-11-12T09:00:00.000Z';
const admin = { id: 'admin-fictif', role: 'administrateur' as const };
const A = { societeId: 'societe-a' };
const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const neuf = () => {
  const stockage = stockageEnMemoire();
  const journal = journalEnMemoire();
  return { stockage, journal, console: creerArretConsole(stockage, journal) };
};
const appPour = (c: ReturnType<typeof neuf>['console'], societe: string) => {
  const a = creerApp(undefined, { securite: { arret: { lire: c.lire, societeDe: () => societe } } });
  apps.push(a);
  return a;
};
const get = (a: ReturnType<typeof creerApp>) => a.inject({ method: 'GET', url: '/ecritures' });

describe('securite/arret-console', () => {
  it('commande-console-coupe-a', async () => {
    const n = neuf();
    const appA = appPour(n.console, 'societe-a');
    const appB = appPour(n.console, 'societe-b');
    expect((await get(appA)).statusCode).toBe(200);
    expect(n.console.commandeArret(A, 'console-fictive', T0)).toBe(true);
    expect((await get(appA)).statusCode).toBe(503);
    expect((await get(appB)).statusCode).toBe(200);
    expect(n.console.coupe('api', 'societe-b')).toBe(false);
    expect(n.console.commandeArret(A, 'console-fictive', T1)).toBe(false);
    expect(n.journal.evenements()).toHaveLength(1);
  });

  it('chat-imports-envois-coupes', () => {
    const n = neuf();
    for (const canal of n.console.canaux) expect(n.console.coupe(canal, 'societe-a')).toBe(false);
    n.console.commandeArret(A, 'console-fictive', T0);
    for (const canal of ['api', 'chat', 'imports', 'envois'] as const) {
      expect(n.console.coupe(canal, 'societe-a')).toBe(true);
      expect(n.console.coupe(canal, 'societe-b')).toBe(false);
    }
  });

  it('reprise-par-administrateur-journalisee', () => {
    const n = neuf();
    n.console.commandeArret(A, 'console-fictive', T0);
    expect(n.console.reprise(A, { id: 'compta-fictive', role: 'comptable' }, T1)).toBe(false);
    expect(n.console.coupe('chat', 'societe-a')).toBe(true);
    expect(n.journal.evenements()).toHaveLength(1);
    expect(n.console.reprise(A, admin, T1)).toBe(true);
    expect(n.console.coupe('chat', 'societe-a')).toBe(false);
    expect(n.journal.evenements()).toEqual([
      { type: 'securite.arret_urgence', cible: A, par: 'console-fictive', horodatage: T0 },
      { type: 'securite.reprise', cible: A, par: 'admin-fictif', horodatage: T1 },
    ]);
  });

  it('redemarrage-garde-le-drapeau', () => {
    const n = neuf();
    n.console.commandeArret('global', 'console-fictive', T0);
    const apres = creerArretConsole(n.stockage, n.journal);
    for (const canal of apres.canaux) expect(apres.coupe(canal, 'societe-b')).toBe(true);
    expect(apres.reprise('global', admin, T1)).toBe(true);
    expect(creerArretConsole(n.stockage, n.journal).coupe('imports', 'societe-b')).toBe(false);
  });

  it('lecture-douteuse-coupe', () => {
    const c = creerArretConsole(
      { lire: () => { throw new Error('indisponible'); }, ecrire: () => undefined },
      journalEnMemoire(),
    );
    expect(c.coupe('envois', 'societe-a')).toBe(true);
  });
});
