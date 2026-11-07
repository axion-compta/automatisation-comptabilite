import type { Centimes } from '../../../noyau/src/argent/index.js';
import { estNegatif, formaterMontantAffiche } from '../format/affichage.js';

export interface MontantProps {
  centimes: Centimes;
  /** Phrase complète lue par les lecteurs d'écran quand le montant est négatif. */
  libelleNegatif?: string;
}

export function Montant({ centimes, libelleNegatif }: MontantProps) {
  const negatif = estNegatif(centimes);
  return (
    <span
      data-signe={negatif ? 'negatif' : undefined}
      aria-label={negatif ? libelleNegatif : undefined}
    >
      {formaterMontantAffiche(centimes)}
    </span>
  );
}
