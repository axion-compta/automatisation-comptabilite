import { useEffect, useId, useRef, useState } from "react";
import { formaterDateAffiche } from "../format/affichage.js";
import { Bouton } from "./Bouton.js";
import { Pastille, type EtatPastille } from "./Pastille.js";
// @ts-expect-error -- ce paquet n'a pas de déclaration de module pour les feuilles .css
import "./carte-alerte.css";

export type GraviteAlerte = "info" | "a_faire" | "urgent" | "bloquant";

export interface CarteAlerteProps {
  alerte: { id: string; gravite: GraviteAlerte; titre: string; echeanceLe?: string };
  textes: {
    gravites: Record<GraviteAlerte, string>;
    echeance: string;
    reporter: string;
    ignorer: string;
    choixJours: string;
    jours(n: number): string;
    motif: string;
    confirmer: string;
    annuler: string;
  };
  joursReport: number[];
  motifMin: number;
  surReporter?(jours: number): void;
  surIgnorer?(motif: string): void;
}

const ETATS: Record<GraviteAlerte, EtatPastille> = { info: "ok", a_faire: "attente", urgent: "bloque", bloquant: "bloque" };
type Panneau = "reporter" | "ignorer" | null;

/** Alerte : gravité en mot, échéance, reporter et ignorer. Émet des intentions, n'appelle pas le serveur. */
export function CarteAlerte({ alerte, textes, joursReport, motifMin, surReporter, surIgnorer }: CarteAlerteProps) {
  const idChamp = useId();
  const [panneau, setPanneau] = useState<Panneau>(null);
  const [motif, setMotif] = useState("");
  const refReporter = useRef<HTMLButtonElement>(null);
  const refIgnorer = useRef<HTMLButtonElement>(null);
  const refChamp = useRef<HTMLInputElement>(null);
  const refJours = useRef<HTMLDivElement>(null);
  const precedent = useRef<Panneau>(null);
  const peutReporter = (alerte.gravite === "info" || alerte.gravite === "a_faire") && surReporter !== undefined;

  useEffect(() => {
    if (panneau === "ignorer") refChamp.current?.focus();
    else if (panneau === "reporter") refJours.current?.querySelector("button")?.focus();
    else if (precedent.current !== null) (precedent.current === "reporter" ? refReporter : refIgnorer).current?.focus();
    precedent.current = panneau;
  }, [panneau]);

  const fermer = () => (setPanneau(null), setMotif(""));
  const valide = motif.trim().length >= motifMin;
  return (
    <section
      className={["axion-carte-alerte", "axion-carte-alerte--" + alerte.gravite].join(" ")}
      onKeyDown={(e) => {
        if (e.key === "Escape" && panneau !== null) fermer();
      }}
    >
      <div className="axion-carte-alerte__entete">
        <Pastille etat={ETATS[alerte.gravite]} libelle={textes.gravites[alerte.gravite]} /><h3 className="axion-carte-alerte__titre">{alerte.titre}</h3>
      </div>
      {alerte.echeanceLe === undefined ? null : (
        <p className="axion-carte-alerte__echeance">{textes.echeance} {formaterDateAffiche(alerte.echeanceLe)}</p>
      )}
      <div className="axion-carte-alerte__actions">
        {peutReporter ? (
          <button type="button" className="axion-bouton axion-bouton--discret" ref={refReporter} onClick={() => setPanneau("reporter")}>{textes.reporter}</button>
        ) : null}
        {alerte.gravite !== "bloquant" ? (
          <button type="button" className="axion-bouton axion-bouton--discret" ref={refIgnorer} onClick={() => setPanneau("ignorer")}>{textes.ignorer}</button>
        ) : null}
      </div>
      {panneau === "reporter" ? (
        <div className="axion-carte-alerte__panneau" role="group" aria-label={textes.choixJours} ref={refJours}>
          <span>{textes.choixJours}</span>
          {joursReport.map((n) => (
            <Bouton
              key={n}
              onClick={() => {
                surReporter?.(n);
                fermer();
              }}
            >
              {textes.jours(n)}
            </Bouton>
          ))}
        </div>
      ) : null}
      {panneau === "ignorer" ? (
        <form
          className="axion-carte-alerte__panneau"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valide) return;
            surIgnorer?.(motif.trim());
            fermer();
          }}
        >
          <label htmlFor={idChamp}>{textes.motif}</label>
          <input id={idChamp} ref={refChamp} type="text" value={motif} onChange={(e) => setMotif(e.target.value)} />
          <Bouton type="submit" desactive={!valide}>{textes.confirmer}</Bouton>
          <Bouton variante="discret" onClick={fermer}>{textes.annuler}</Bouton>
        </form>
      ) : null}
    </section>
  );
}
