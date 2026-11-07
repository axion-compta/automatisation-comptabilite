import { centimes } from '../../../noyau/src/argent/index.js';
import { Carte } from './Carte.js';
import { Montant } from './Montant.js';

/** État recopié de carteTva (pas d'import du noyau métier : packages/ui n'en dépend pas). */
export type EtatCarteTva =
  | { etat: 'montant'; centimes: number }
  | { etat: 'a_confirmer' }
  | { etat: 'bloquee'; pieces: number }
  | { etat: 'payee'; par: string; le: string };

export interface TextesCarteTva {
  titre: string;
  aConfirmer: string;
  bloquee: string;
  payee: string;
  lienPieces: string;
  echeance: string;
}

export interface CarteTvaAPayerProps {
  etat: EtatCarteTva;
  echeance: string;
  textes: TextesCarteTva;
  lienPieces: string;
}

/** Carte « TVA à payer » : le logiciel ne paie jamais, aucune action de paiement. */
export function CarteTvaAPayer({ etat, echeance, textes, lienPieces }: CarteTvaAPayerProps) {
  return (
    <Carte titre={textes.titre}>
      <div className="axion-carte-tva" data-etat={etat.etat}>
        {etat.etat === 'montant' && (
          <p className="axion-carte-tva__montant">
            <Montant centimes={centimes(etat.centimes)} />
          </p>
        )}
        {etat.etat === 'a_confirmer' && <p className="axion-carte-tva__statut">{textes.aConfirmer}</p>}
        {etat.etat === 'bloquee' && (
          <p className="axion-carte-tva__statut">
            <span>{textes.bloquee}</span>
            {lienPieces !== '' && (
              <>
                {' '}
                <a className="axion-carte-tva__lien" href={lienPieces}>
                  {textes.lienPieces}
                </a>
              </>
            )}
          </p>
        )}
        {etat.etat === 'payee' && (
          <p className="axion-carte-tva__statut">
            <span>{textes.payee}</span> <span data-champ="par">{etat.par}</span>{' '}
            <span data-champ="le">{etat.le}</span>
          </p>
        )}
        <p className="axion-carte-tva__echeance">
          <span>{textes.echeance}</span> <span data-champ="echeance">{echeance}</span>
        </p>
      </div>
    </Carte>
  );
}
