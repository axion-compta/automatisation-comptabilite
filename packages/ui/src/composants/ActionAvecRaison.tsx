import { useId } from "react";
import { Bouton } from "./Bouton.js";
import "./action-avec-raison.css";

export type CapaciteAction = { permis: true } | { permis: false; raison_texte: string };

export interface ActionAvecRaisonProps {
  libelle: string;
  capacite: CapaciteAction;
  onAction: () => void;
}

/** Action permise, ou refusée avec sa phrase visible : bouton focalisable `aria-disabled`, jamais `disabled`. Textes par propriétés. */
export function ActionAvecRaison({ libelle, capacite, onAction }: ActionAvecRaisonProps) {
  const idRaison = useId();
  if (capacite.permis) {
    return (
      <div className="axion-action-raison">
        <Bouton onClick={onAction}>{libelle}</Bouton>
      </div>
    );
  }
  const raison = capacite.raison_texte;
  if (typeof raison !== "string" || raison.trim() === "") {
    throw new Error("ActionAvecRaison : une action refusée exige une phrase de raison non vide.");
  }
  return (
    <div className="axion-action-raison">
      <Bouton className="axion-action-raison__refusee" aria-disabled="true" aria-describedby={idRaison}>
        {libelle}
      </Bouton>
      <p id={idRaison} className="axion-action-raison__phrase">
        {raison}
      </p>
    </div>
  );
}
