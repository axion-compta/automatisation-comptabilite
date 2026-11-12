import { useState, type KeyboardEvent } from "react";
import type { Centimes } from "../../../noyau/src/argent/index.js";
import { formaterDateAffiche } from "../format/affichage.js";
import { Bouton } from "./Bouton.js";
import { Montant } from "./Montant.js";
import "./carte-action.css";

export type NiveauAction = "B" | "M" | "I";
export type EtatCarteAction = "a_valider" | "modification" | "confirmation" | "appliquee" | "plus_tard" | "expiree" | "erreur";
export type ContexteCarteAction = "centre" | "chat";

export interface CarteActionProps {
  proposition: { niveau: NiveauAction; nombreObjets: number; periode?: string; montantTotalCentimes?: Centimes };
  libelles: {
    mention: string;
    mentionValidee(personne: string, date: string): string;
    objets(n: number): string;
    periode(p: string): string;
    valider: string;
    modifier: string;
    refuser: string;
    plusTard: string;
    rouvrir: string;
    confirmer: string;
    ouvrirEcran: string;
    pourquoi: string;
  };
  etat: EtatCarteAction;
  /** Ne change que la mise en page (classe CSS), jamais les libellés ni l'ordre. */
  contexte?: ContexteCarteAction;
  validation?: { personne: string; date: string };
  onAppliquer(): void;
  onModifier(): void;
  onRefuser(): void;
  onRouvrir?(): void;
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
export function CarteAction({ proposition, libelles, etat, contexte = "chat", validation, onAppliquer, onModifier, onRefuser, onRouvrir, onOuvrirEcran, onPourquoi }: CarteActionProps) {
  const [ouverte, setOuverte] = useState(false);
  const { niveau, nombreObjets, periode, montantTotalCentimes } = proposition;
  const effectif: EtatCarteAction = ouverte && niveau === "M" && (etat === "a_valider" || etat === "modification" || etat === "erreur") ? "confirmation" : etat;
  const actif = effectif === "a_valider" || effectif === "confirmation" || effectif === "modification" || effectif === "erreur";
  const montantValide = typeof montantTotalCentimes === "number" && Number.isSafeInteger(montantTotalCentimes);
  const objetsValides = Number.isSafeInteger(nombreObjets) && nombreObjets >= 0;
  const mention = effectif === "appliquee" && validation ? libelles.mentionValidee(validation.personne, dateAffichee(validation.date)) : libelles.mention;
  // Le clic seul applique un niveau M ou I : la touche Entrée est neutralisée (carte et boutons).
  const surTouche = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" && niveau !== "B") e.preventDefault();
  };
  return (
    <div className={["axion-carte-action", `axion-carte-action--${contexte}`].join(" ")} onKeyDown={surTouche}>
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
        {actif && niveau === "B" && <Bouton onClick={onAppliquer}>{libelles.valider}</Bouton>}
        {actif && niveau === "M" && effectif !== "confirmation" && <Bouton onClick={() => setOuverte(true)}>{libelles.valider}</Bouton>}
        {actif && niveau === "M" && effectif === "confirmation" && <Bouton onClick={onAppliquer}>{libelles.confirmer}</Bouton>}
        {actif && effectif !== "modification" && (
          <Bouton variante="discret" onClick={() => (setOuverte(false), onModifier())}>
            {libelles.modifier}
          </Bouton>
        )}
        {actif && (
          <Bouton variante="discret" onClick={() => (setOuverte(false), onRefuser())}>
            {libelles.refuser}
          </Bouton>
        )}
        {effectif === "plus_tard" && <p className="axion-carte-action__plus-tard">{libelles.plusTard}</p>}
        {effectif === "plus_tard" && onRouvrir && (
          <Bouton variante="discret" onClick={onRouvrir}>
            {libelles.rouvrir}
          </Bouton>
        )}
        <Bouton variante="discret" onClick={onPourquoi}>
          {libelles.pourquoi}
        </Bouton>
      </div>
    </div>
  );
}
