import { describe, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

/** Suite commune du domaine « exports » : vide pour l'instant (jouée sur les deux cibles). */
export function suiteExports(nom: string, cible: Cible): void {
  void cible;
  describe('suite exports commune : ' + nom, () => {
    it.todo('suite exports');
  });
}
