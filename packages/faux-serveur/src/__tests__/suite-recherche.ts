import { describe, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

/** Suite commune du domaine « recherche » : vide pour l'instant (jouée sur les deux cibles). */
export function suiteRecherche(nom: string, cible: Cible): void {
  void cible;
  describe('suite recherche commune : ' + nom, () => {
    it.todo('suite recherche');
  });
}
