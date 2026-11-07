import type { Centimes } from '../../../noyau/src/argent/index.js';
import { Montant } from './Montant.js';

export interface IndicateurProps {
  libelle: string;
  /** null = non calculé : le texte d'absence s'affiche, jamais « 0 ». */
  montant: Centimes | null;
  texteAbsence?: string;
  /** Lien vers les pièces qui composent le nombre. */
  href?: string;
  provisoire?: boolean;
  texteProvisoire?: string;
  /** Squelette sans aucun chiffre tant que le calcul n'est pas terminé. */
  chargement?: boolean;
}

export function Indicateur({
  libelle,
  montant,
  texteAbsence,
  href,
  provisoire,
  texteProvisoire,
  chargement,
}: IndicateurProps) {
  if (chargement) {
    return (
      <div className="axion-indicateur" aria-busy="true">
        <span className="axion-indicateur__libelle">{libelle}</span>
        <span className="axion-indicateur__squelette" aria-hidden="true" />
      </div>
    );
  }
  const contenu = (
    <>
      <span className="axion-indicateur__libelle">{libelle}</span>{' '}
      <span className="axion-indicateur__valeur">
        {montant === null ? texteAbsence : <Montant centimes={montant} />}
      </span>
    </>
  );
  return (
    <div className="axion-indicateur" data-provisoire={provisoire ? 'oui' : undefined}>
      {href ? (
        <a className="axion-indicateur__lien" href={href}>
          {contenu}
        </a>
      ) : (
        contenu
      )}
      {provisoire && texteProvisoire ? (
        <span className="axion-indicateur__etiquette">{texteProvisoire}</span>
      ) : null}
    </div>
  );
}
