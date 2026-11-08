import { useState, type KeyboardEvent } from "react";
import type { Centimes } from "../../../noyau/src/argent/index.js";
import { formaterDateAffiche } from "../format/affichage.js";
import { Bouton } from "./Bouton.js";
import { Montant } from "./Montant.js";
import "./carte-action.css";

export type NiveauAction = "B" | "M" | "I";
export type EtatCarteAction = "a_valider" | "confirmation" | "appliquee" | "expiree";

export interface CarteActionProps {
  proposition: { niveau: NiveauAction; nombreObjets: number; periode?: string; montantTotalCentimes?: Centimes };
  libelles: {
    mention: string;
    mentionValidee(personne: string, date: string): string;
    objets(n: number): string;
    periode(p: string): string;
    appliquer: string;
    confirmer: string;
    ouvrirEcran: string;
    pourquoi: string;
  };
  etat: EtatCarteAction;
  validation?: { personne: string; date: string };
  onAppliquer(): void;
  onOuvrirEcran(): void;
  onPourquoi(): void;
}

function dateAffichee(date: string): string {
  try {
    return formaterDateAffiche(date);
  } catch {
    return date;
  }
}

/** Carte d'intention « J'ai compris ». Entrée n'applique jamais une action M ou I (CHT-056) ; niveau I : ouvrir l'écran seulement. */
export function CarteAction({ proposition, libelles, etat, validation, onAppliquer, onOuvrirEcran, onPourquoi }: CarteActionProps) {
  const [ouverte, setOuverte] = useState(false);
  const { niveau, nombreObjets, periode, montantTotalCentimes } = proposition;
  const effectif: EtatCarteAction = etat === "a_valider" && ouverte && niveau === "M" ? "confirmation" : etat;
  const actif = effectif === "a_valider" || effectif === "confirmation";
  const montantValide = typeof montantTotalCentimes === "number" && Number.isSafeInteger(montantTotalCentimes);
  const objetsValides = Number.isSafeInteger(nombreObjets) && nombreObjets >= 0;
  const mention = effectif === "appliquee" && validation ? libelles.mentionValidee(validation.personne, dateAffichee(validation.date)) : libelles.mention;
  // Le clic seul applique un niveau M ou I : la touche Entrée est neutralisée (carte et boutons).
  const surTouche = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" && niveau !== "B") e.preventDefault();
  };
  return (
    <div className="axion-carte-action" onKeyDown={surTouche}>
      <div className="axion-carte-action__resume" aria-live="polite" data-etat={effectif}>
        {objetsValides && <p className="axion-carte-action__objets">{libelles.objets(nombreObjets)}</p>}
        {periode !== undefined && periode !== "" && <p className="axion-carte-action__periode">{libelles.periode(periode)}</p>}
        {montantValide && (
          <p className="axion-carte-action__montant">
            <Montant centimes={montantTotalCentimes} />
          </p>
        )}
      </div>
      <p className="axion-carte-action__mention">{mention}</p>
      <div className="axion-carte-action__actions">
        {actif && niveau === "I" && <Bouton onClick={onOuvrirEcran}>{libelles.ouvrirEcran}</Bouton>}
        {actif && niveau === "B" && <Bouton onClick={onAppliquer}>{libelles.appliquer}</Bouton>}
        {actif && niveau === "M" && effectif === "a_valider" && <Bouton onClick={() => setOuverte(true)}>{libelles.appliquer}</Bouton>}
        {actif && niveau === "M" && effectif === "confirmation" && <Bouton onClick={onAppliquer}>{libelles.confirmer}</Bouton>}
        <Bouton variante="discret" onClick={onPourquoi}>
          {libelles.pourquoi}
        </Bouton>
      </div>
    </div>
  );
}
