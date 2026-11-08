import { describe, expect, it } from 'vitest';
import type { PortSession, Session } from '../port.js';

const base: Session = {
  personneId: 'personne-fictive-1', nature: 'personne', organisationId: 'org-fictive-1',
  organisations: ['org-fictive-1'], societeId: 'societe-fictive-1', societes: ['societe-fictive-1'],
  roles: ['utilisateur'], permissions: ['compta-lire'], revendications: { acr: 'mfa', authTime: 1 },
};
const autre: Session = { ...base, personneId: 'personne-fictive-2', roles: ['lecture'] };
const multi: Session = {
  ...base, personneId: 'personne-fictive-3', organisations: ['org-fictive-1', 'org-fictive-2'],
};

export function suiteSession(nom: string, fabrique: (s: Readonly<Record<string, Session>>) => PortSession): void {
  const creer = () =>
    fabrique({ 'session-fictive-1': base, 'session-fictive-2': autre, 'session-fictive-3': multi });
  describe(`contrat PortSession : ${nom}`, () => {
    it('reference-inconnue-null', async () => {
      expect(await creer().lire('session-fictive-inconnue')).toBeNull();
      expect(await creer().lire('')).toBeNull();
      expect(await creer().lire('constructor')).toBeNull();
    });
    it('reference-nulle-null', async () => {
      expect(await creer().lire(null)).toBeNull();
    });
    it('session-rendue-valide', async () => {
      expect(await creer().lire('session-fictive-1')).toEqual(base);
    });
    it('copie-independante', async () => {
      const port = creer();
      const a = (await port.lire('session-fictive-1')) as unknown as { roles: string[] };
      try { a.roles.push('administrateur'); } catch { /* copie gelée : refus accepté */ }
      const b = await port.lire('session-fictive-1');
      expect(b).toEqual(base);
      expect(b).not.toBe(a);
    });
    it('deux-personnes-distinctes', async () => {
      const port = creer();
      expect((await port.lire('session-fictive-1'))?.personneId).toBe('personne-fictive-1');
      expect((await port.lire('session-fictive-2'))?.personneId).toBe('personne-fictive-2');
    });
    it('plusieurs-organisations', async () => {
      expect((await creer().lire('session-fictive-3'))?.organisations).toEqual(['org-fictive-1', 'org-fictive-2']);
    });
  });
}
