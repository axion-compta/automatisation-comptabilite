import { useId, type ReactNode } from "react";
import { MotConfiance, type MotConfiance as Confiance } from "./MotConfiance.js";
import { Pastille, type EtatPastille } from "./Pastille.js";

export type StatutChamp = "confirme" | "a_confirmer" | "vide" | "je_ne_sais_pas";

export interface ChampSourceProps {
  intitule: string;
  valeur: ReactNode;
  statut: StatutChamp;
  confiance?: Confiance;
  source?: { href: string; libelle: string } | null;
  libelles: {
    statut: Record<StatutChamp, string>;
    confiance: Record<Confiance, string>;
    voirLaSource: string;
    vide: string;
  };
}

const ETAT_PAR_STATUT: Record<StatutChamp, EtatPastille> = {
  confirme: "ok",
  a_confirmer: "attente",
  vide: "attente",
  je_ne_sais_pas: "attente",
};

/** Chemin relatif ou https: seulement ; tout autre schéma, ou une chaîne vide, donne pas de lien. */
export function hrefSur(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const h = href.trim();
  if (h === "" || /\s/.test(h)) return null;
  if (/^(\/(?![/\\])|\.\.?\/)/.test(h)) return h;
  try {
    return new URL(h).protocol === "https:" ? h : null;
  } catch {
    return null;
  }
}

function estVide(valeur: ReactNode): boolean {
  return valeur === null || valeur === undefined || valeur === false || (typeof valeur === "string" && valeur.trim() === "");
}

export function ChampSource({ intitule, valeur, statut, confiance, source, libelles }: ChampSourceProps) {
  const id = useId();
  const href = source ? hrefSur(source.href) : null;
  const classes = ["axion-champ-source", "axion-champ-source--" + statut].join(" ");
  return (
    <div role="group" aria-labelledby={id} className={classes}>
      <span id={id} className="axion-champ-source__intitule">{intitule}</span>
      <span className="axion-champ-source__valeur">{estVide(valeur) ? libelles.vide : valeur}</span>
      <Pastille etat={ETAT_PAR_STATUT[statut]} libelle={libelles.statut[statut]} />
      {confiance ? <MotConfiance mot={confiance} libelles={libelles.confiance} /> : null}
      {source && href ? (
        <a className="axion-champ-source__lien" href={href} title={source.libelle}>
          {libelles.voirLaSource}
        </a>
      ) : null}
    </div>
  );
}
