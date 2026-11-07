import { Fragment } from "react";
import { centimes } from "../../../noyau/src/argent/index.js";
import { formaterDateAffiche, formaterMontantAffiche } from "../format/affichage.js";

export interface Source { type: string; id: string }
export type Segment =
  | { sorte: "texte"; texte: string }
  | { sorte: "valeur"; valeur: string | number; nature: "montant" | "date" | "compte" | "taux" | "nombre"; source: Source }
  | { sorte: "inconnu" };

export interface TexteSourcesProps {
  segments: Segment[];
  libelles: { inconnu: string; voirSource: string; lexique: string };
  onSource: (source: Source) => void;
}

const MARQUEURS = /(⟦voir_source⟧|⟦lexique⟧)/;

type SegmentValeur = Extract<Segment, { sorte: "valeur" }>;

function formater(s: SegmentValeur): string | null {
  const v = s.valeur;
  try {
    if (s.nature === "montant") return typeof v === "number" ? formaterMontantAffiche(centimes(v)) : null;
    if (s.nature === "date") return typeof v === "string" ? formaterDateAffiche(v) : null;
  } catch {
    return null;
  }
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : null;
  return v === "" ? null : v;
}

export function TexteSources({ segments, libelles, onSource }: TexteSourcesProps) {
  const dire = (t: string) => t.split(MARQUEURS).map((p, i) => <Fragment key={i}>{p === "⟦voir_source⟧" ? libelles.voirSource : p === "⟦lexique⟧" ? libelles.lexique : p}</Fragment>);
  return (
    <p className="axion-texte-sources">
      {segments.map((s, i) => {
        if (s.sorte === "texte") return <Fragment key={i}>{dire(s.texte)}</Fragment>;
        const texte = s.sorte === "valeur" ? formater(s) : null;
        if (s.sorte === "inconnu" || texte === null) return <span key={i} data-inconnu="">{libelles.inconnu}</span>;
        return <button key={i} type="button" className="axion-texte-sources__valeur" onClick={() => onSource(s.source)}>{texte}</button>;
      })}
    </p>
  );
}
