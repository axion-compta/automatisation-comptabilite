import { describe, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

/** Suite commune du domaine « preferences » : vide pour l'instant (jouée sur les deux cibles). */
export function suitePreferences(nom: string, cible: Cible): void {
  void cible;
  describe('suite preferences commune : ' + nom, () => {
    it.todo('suite preferences');
  });
}
