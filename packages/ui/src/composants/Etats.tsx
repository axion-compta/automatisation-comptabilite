import { Bouton } from "./Bouton.js";

export interface EtatChargementProps {
  libelle: string;
}

export function EtatChargement({ libelle }: EtatChargementProps) {
  return (
    <div className="axion-etat axion-etat--chargement" role="status" aria-busy="true">
      {libelle}
    </div>
  );
}

export interface EtatVideProps {
  titre: string;
  detail?: string;
}

export function EtatVide({ titre, detail }: EtatVideProps) {
  return (
    <div className="axion-etat axion-etat--vide">
      <p className="axion-etat__titre">{titre}</p>
      {detail ? <p className="axion-etat__detail">{detail}</p> : null}
    </div>
  );
}

export interface EtatErreurProps {
  message: string;
  libelleReessayer?: string;
  surReessayer?: () => void;
}

export function EtatErreur({ message, libelleReessayer, surReessayer }: EtatErreurProps) {
  return (
    <div className="axion-etat axion-etat--erreur" role="alert">
      <p className="axion-etat__titre">{message}</p>
      {libelleReessayer && surReessayer ? (
        <Bouton variante="discret" onClick={surReessayer}>
          {libelleReessayer}
        </Bouton>
      ) : null}
    </div>
  );
}

export interface EtatDouteProps {
  /** Texte de l'état (« à vérifier »), fourni par les textes de l'appelant. */
  message: string;
  /** Raison du doute, toujours affichée en texte. */
  raison: string;
  libelleAction?: string;
  surAction?: () => void;
}

/** État « doute » : l'information existe mais demande une vérification. Dit par le texte, jamais par la couleur seule. */
export function EtatDoute({ message, raison, libelleAction, surAction }: EtatDouteProps) {
  return (
    <div className="axion-etat axion-etat--doute" role="status">
      <p className="axion-etat__titre">{message}</p>
      <p className="axion-etat__detail">{raison}</p>
      {libelleAction && surAction ? (
        <Bouton variante="discret" onClick={surAction}>
          {libelleAction}
        </Bouton>
      ) : null}
    </div>
  );
}
