import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import type { AppelIa, DecisionIa } from "../../../contrat/src/chat/journal-ia.js";
import { formaterDateAffiche } from "../format/affichage.js";
import { MotConfiance, type MotConfiance as Confiance } from "./MotConfiance.js";
import "./pourquoi.css";

export interface PourquoiLibelles {
  bouton: string;
  demandeur: string;
  systeme: string;
  date: string;
  source: string;
  motif: string;
  confiance: string;
  sourcesLegales: string;
  modele: string;
  nonDisponible: string;
  sources: Record<DecisionIa["source_proposition"], string>;
  mots: Record<Confiance, string>;
}

export interface PourquoiProps {
  decision: DecisionIa;
  appel?: AppelIa | undefined;
  libelles: PourquoiLibelles;
  onSource: (identifiant: string) => void;
}

// Aucun appel à Date : la date vient d'une découpe de chaîne, ou « non disponible ».
function dateOuNonDisponible(quand: unknown, absent: string): string {
  try {
    return formaterDateAffiche(String(quand).slice(0, "AAAA-MM-JJ".length));
  } catch {
    return absent;
  }
}

/** Panneau « Pourquoi ? » : champs de la décision seulement, jamais le texte brut lu par l'IA. */
export function Pourquoi({ decision, appel, libelles, onSource }: PourquoiProps) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  const absent = libelles.nonDisponible;
  const demandeur = decision.demandeur.sorte === "systeme" ? libelles.systeme : decision.demandeur.id;
  const modele = appel ? `${appel.alias} (${appel.version_modele})` : absent;
  const sources = (
    <ul key="s" className="axion-pourquoi__sources">
      {decision.sources_legales.map((s) => (
        <li key={s}>
          <button type="button" className="axion-pourquoi__source" onClick={() => onSource(s)}>
            {s}
          </button>
        </li>
      ))}
    </ul>
  );
  const lignes: [string, ReactNode][] = [
    [libelles.demandeur, demandeur],
    [libelles.date, dateOuNonDisponible(decision.quand, absent)],
    [libelles.source, libelles.sources[decision.source_proposition]],
    [libelles.motif, decision.motif],
    [libelles.confiance, <MotConfiance key="c" mot={decision.confiance} libelles={libelles.mots} />],
    [libelles.sourcesLegales, sources],
    [libelles.modele, modele],
  ];
  const surTouche = (e: KeyboardEvent) => {
    if (e.key === "Escape") setOuvert(false);
  };
  return (
    <div className="axion-pourquoi" onKeyDown={surTouche}>
      <button type="button" className="axion-pourquoi__bouton" aria-expanded={ouvert} aria-controls={id} onClick={() => setOuvert(!ouvert)}>
        {libelles.bouton}
      </button>
      {ouvert ? (
        <dl id={id} className="axion-pourquoi__panneau">
          {lignes.map(([intitule, valeur]) => (
            <div key={intitule} className="axion-pourquoi__ligne">
              <dt className="axion-pourquoi__intitule">{intitule}</dt>
              <dd className="axion-pourquoi__valeur">{valeur}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
