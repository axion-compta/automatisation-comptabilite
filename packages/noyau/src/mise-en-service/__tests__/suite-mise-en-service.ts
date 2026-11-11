import { describe, expect, it } from 'vitest';
import type { EnsembleMiseEnService } from '../port.js';

export type ServiceATester = EnsembleMiseEnService & {
  /** La prochaine création échoue une fois, après la création de la base et avant les migrations. */
  injecterPanne(): void;
  nombreBases(): number;
};
export type Fabrique = () => ServiceATester;

/** Test de contrat : tout adaptateur réel (console, serveur de bases) doit passer cette suite. */
export function suiteMiseEnService(nom: string, fabrique: Fabrique): void {
  describe('suite mise en service : ' + nom, () => {
    it('dix-creations-simultanees-une-seule-base', async () => {
      const s = fabrique();
      const reponses = await Promise.all(
        Array.from({ length: 10 }, () => s.console.creerEspace({ cle: 'cle-creation-1', identifiant: 'dupont' })),
      );
      expect(s.nombreBases()).toBe(1);
      expect(reponses.every((r) => r.base === 'cli_dupont' && r.etat === 'pret')).toBe(true);
      expect(reponses.filter((r) => !r.rejoue)).toHaveLength(1);
      expect(await s.bases.verifierEtat('cli_dupont')).toEqual({ existe: true, migrationsAppliquees: 3 });
    });

    it('creations-simultanees-autres-cles-refusees-sans-seconde-base', async () => {
      const s = fabrique();
      const r = await Promise.allSettled(
        Array.from({ length: 5 }, (_, i) => s.console.creerEspace({ cle: 'cle-creation-' + i, identifiant: 'martin' })),
      );
      expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
      expect(s.nombreBases()).toBe(1);
    });

    it('panne-entre-base-et-migrations-puis-rejeu', async () => {
      const s = fabrique();
      s.injecterPanne();
      await expect(s.console.creerEspace({ cle: 'cle-creation-2', identifiant: 'durand' })).rejects.toThrow('panne_simulee');
      expect(await s.console.etatEspace('durand')).toBe('en_creation');
      expect(await s.bases.verifierEtat('cli_durand')).toEqual({ existe: true, migrationsAppliquees: 0 });
      const r = await s.console.creerEspace({ cle: 'cle-creation-2', identifiant: 'durand' });
      expect(r.etat).toBe('pret');
      expect(await s.console.etatEspace('durand')).toBe('pret');
      expect(s.nombreBases()).toBe(1);
    });

    it('migrations-appliquees-deux-fois-aucun-changement', async () => {
      const s = fabrique();
      await s.bases.creerBase('cli_leroy');
      expect(await s.bases.appliquerMigrations('cli_leroy')).toBeGreaterThan(0);
      const avant = await s.bases.verifierEtat('cli_leroy');
      expect(await s.bases.appliquerMigrations('cli_leroy')).toBe(0);
      expect(await s.bases.verifierEtat('cli_leroy')).toEqual(avant);
      expect(await s.bases.creerBase('cli_leroy')).toBe(false);
    });

    it('espace-inconnu-et-operations-idempotentes', async () => {
      const s = fabrique();
      expect(await s.console.etatEspace('absent')).toBeNull();
      await expect(s.console.suspendre({ cle: 'cle-suspension-1', organisationId: 'absent' })).rejects.toThrow('espace_inconnu');
      await s.console.creerEspace({ cle: 'cle-creation-3', identifiant: 'petit' });
      const d = { cle: 'cle-invitation-1', organisationId: 'petit', personne: 'a@exemple.fr', role: 'comptable' };
      const premier = await s.console.inviter(d);
      expect(await s.console.inviter(d)).toEqual(premier);
      await expect(s.console.inviter({ ...d, personne: 'b@exemple.fr' })).rejects.toThrow('cle_reutilisee');
      await s.console.suspendre({ cle: 'cle-suspension-2', organisationId: 'petit' });
      await s.console.geler({ cle: 'cle-gel-1', organisationId: 'petit', motif: 'essai' });
      expect(await s.console.supprimer({ cle: 'cle-suppr-1', organisationId: 'petit' })).toHaveProperty('permis');
    });
  });
}
