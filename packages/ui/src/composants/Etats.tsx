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
