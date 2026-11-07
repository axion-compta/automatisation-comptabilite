import { describe, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

/** Suite commune du domaine « calendrier » : vide pour l'instant (jouée sur les deux cibles). */
export function suiteCalendrier(nom: string, cible: Cible): void {
  void cible;
  describe('suite calendrier commune : ' + nom, () => {
    it.todo('suite calendrier');
  });
}
