import { useId, type ReactNode } from "react";
import { MotConfiance, type MotConfiance as Mot } from "./MotConfiance.js";

export interface ChampLuProps {
  libelle: string;
  valeur: ReactNode;
  mot: Mot;
  libelles: Record<Mot, string>;
  explication?: string;
}

/** À placer dans un <dl>. Seul le champ douteux ou à vérifier est mis en évidence. */
export function ChampLu({ libelle, valeur, mot, libelles, explication }: ChampLuProps) {
  const idExplication = useId();
  const enEvidence = mot !== "sur";
  const decrit = enEvidence && explication !== undefined;
  return (
    <>
      <dt className="axion-champ-lu__libelle">{libelle}</dt>
      <dd
        className={enEvidence ? `axion-champ-lu__valeur axion-champ-lu__valeur--evidence axion-champ-lu__valeur--${mot}` : "axion-champ-lu__valeur"}
        aria-describedby={decrit ? idExplication : undefined}
      >
        <span>{valeur}</span> <MotConfiance mot={mot} libelles={libelles} />
        {decrit ? (
          <span id={idExplication} className="axion-champ-lu__explication">
            {explication}
          </span>
        ) : null}
      </dd>
    </>
  );
}
