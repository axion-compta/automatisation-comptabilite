import { describe, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

/** Suite commune du domaine « alertes » : vide pour l'instant (jouée sur les deux cibles). */
export function suiteAlertes(nom: string, cible: Cible): void {
  void cible;
  describe('suite alertes commune : ' + nom, () => {
    it.todo('suite alertes');
  });
}
