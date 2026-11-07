import { useEffect, useId, useRef, useState } from "react";
import { centimes } from "../../../noyau/src/argent/index.js";
import { Bouton } from "./Bouton.js";
import { Montant } from "./Montant.js";
// @ts-expect-error -- ce paquet n'a pas de déclaration de module pour les feuilles .css
import "./confirmation-renforcee.css";

export interface ConfirmationRenforceeProps {
  niveau: "simple" | "renforcee";
  nombre: number;
  totalCentimes: number;
  comptes: string[];
  textes: { titre: string; caseACocher: string; bouton: string; annuler: string };
  onConfirmer(): void;
  onAnnuler(): void;
}

/** Récapitulatif chiffré avant d'appliquer ; en renforcée, la case doit être cochée. Textes par propriétés. */
export function ConfirmationRenforcee({ niveau, nombre, totalCentimes, comptes, textes, onConfirmer, onAnnuler }: ConfirmationRenforceeProps) {
  const idTitre = useId();
  const idCase = useId();
  const refTitre = useRef<HTMLHeadingElement>(null);
  const [cochee, setCochee] = useState(false);
  useEffect(() => {
    refTitre.current?.focus();
  }, []);
  const renforcee = niveau === "renforcee";
  const bloque = renforcee && !cochee;
  return (
    <section className="axion-confirmation" role="alertdialog" aria-labelledby={idTitre}>
      <h2 id={idTitre} ref={refTitre} tabIndex={-1} className="axion-confirmation__titre">
        {textes.titre}
      </h2>
      <p className="axion-confirmation__recap">
        <span>{nombre}</span> <Montant centimes={centimes(totalCentimes)} />
      </p>
      <ul className="axion-confirmation__comptes">
        {comptes.map((c, i) => (
          <li key={`${i}-${c}`}>{c}</li>
        ))}
      </ul>
      {renforcee ? (
        <div className="axion-confirmation__case">
          <input id={idCase} type="checkbox" checked={cochee} onChange={(e) => setCochee(e.target.checked)} />
          <label htmlFor={idCase}>{textes.caseACocher}</label>
        </div>
      ) : null}
      <div className="axion-confirmation__actions">
        <Bouton desactive={bloque} onClick={() => (bloque ? undefined : onConfirmer())}>
          {textes.bouton}
        </Bouton>
        <Bouton variante="discret" onClick={onAnnuler}>
          {textes.annuler}
        </Bouton>
      </div>
    </section>
  );
}
