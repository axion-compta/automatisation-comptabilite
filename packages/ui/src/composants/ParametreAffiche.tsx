import type { ReactNode } from "react";
import { formaterDateAffiche } from "../format/affichage.js";
import { Pastille } from "./Pastille.js";

export interface ParametreAfficheProps {
  valeur: ReactNode;
  aVerifier: boolean;
  source: { titre: string; url: string };
  dateReleve: string;
  libelles: { aVerifier: string; source: string; releveLe: string };
}

function dateSure(date: unknown): string | null {
  if (typeof date !== "string") return null;
  try {
    return formaterDateAffiche(date);
  } catch {
    return null;
  }
}

function urlHttps(url: unknown): boolean {
  if (typeof url !== "string" || /\s/.test(url)) return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

export function ParametreAffiche({ valeur, aVerifier, source, dateReleve, libelles }: ParametreAfficheProps) {
  const date = dateSure(dateReleve);
  return (
    <div className="axion-parametre">
      <span className="axion-parametre__valeur">{valeur}</span>
      {aVerifier || date === null ? <Pastille etat="attente" libelle={libelles.aVerifier} /> : null}
      <span className="axion-parametre__source">
        {libelles.source}{" "}
        {urlHttps(source.url) ? <a href={source.url}>{source.titre}</a> : <span>{source.titre}</span>}
      </span>
      {date !== null ? <span className="axion-parametre__date">{libelles.releveLe} {date}</span> : null}
    </div>
  );
}
