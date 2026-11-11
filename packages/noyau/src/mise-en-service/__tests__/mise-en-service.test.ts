import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { creerServiceMemoire } from '../memoire.js';
import { suiteMiseEnService } from './suite-mise-en-service.js';

suiteMiseEnService('faux service en mémoire', () => creerServiceMemoire());

describe('mise-en-service/memoire', () => {
  it('panne-consommee-une-seule-fois', async () => {
    const s = creerServiceMemoire();
    s.injecterPanne();
    await expect(s.console.creerEspace({ cle: 'cle-creation-1', identifiant: 'un' })).rejects.toThrow('panne_simulee');
    await s.console.creerEspace({ cle: 'cle-creation-1', identifiant: 'un' });
    const r = await s.console.creerEspace({ cle: 'cle-creation-2', identifiant: 'deux' });
    expect(r.etat).toBe('pret');
    expect(s.nombreBases()).toBe(2);
  });

  it('migrations-sans-base-refusees', async () => {
    await expect(creerServiceMemoire().bases.appliquerMigrations('cli_absente')).rejects.toThrow('base_absente');
    expect(await creerServiceMemoire().bases.verifierEtat('cli_absente')).toEqual({ existe: false, migrationsAppliquees: 0 });
  });

  it('une-erreur-ne-bloque-pas-la-file-de-l-organisation', async () => {
    const s = creerServiceMemoire();
    await expect(s.console.suspendre({ cle: 'cle-suspension-1', organisationId: 'zz' })).rejects.toThrow('espace_inconnu');
    await expect(s.console.creerEspace({ cle: 'cle-creation-1', identifiant: 'zz' })).resolves.toMatchObject({ etat: 'pret' });
  });

  it('aucun-import-reseau-ni-process-env', () => {
    for (const f of ['port.ts', 'memoire.ts']) {
      const src = readFileSync(new URL('../' + f, import.meta.url), 'utf8')
        .split('\n').filter((l) => !/stryker/i.test(l)).join('\n');
      expect(src).not.toMatch(/process\.env/);
      expect(src).not.toMatch(/from '(?:\.\.\/)+(?:apps|\.\.\/apps)|from 'node:(?:http|https|net|dns)|fetch\(|https?:\/\//);
      expect(src).not.toMatch(/inscri|register|signup|password|oubli/i);
    }
  });
});
