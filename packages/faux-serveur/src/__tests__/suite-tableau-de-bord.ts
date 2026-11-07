import { describe, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

/** Suite commune du domaine « tableau-de-bord » : vide pour l'instant (jouée sur les deux cibles). */
export function suiteTableauDeBord(nom: string, cible: Cible): void {
  void cible;
  describe('suite tableau-de-bord commune : ' + nom, () => {
    it.todo('suite tableau-de-bord');
  });
}
