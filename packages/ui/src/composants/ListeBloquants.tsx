import { useId } from "react";
// @ts-expect-error -- ce paquet n'a pas de déclaration de module pour les feuilles .css
import "./liste-bloquants.css";

export interface PointBloquant {
  cle: string;
  phrase: string;
  lien?: { libelle: string; href: string };
}

export interface ListeBloquantsProps {
  titre: string;
  points: PointBloquant[];
  vide: string;
}

const hrefSur = (href: string): boolean => href.startsWith("https:") || (href.startsWith("/") && !href.startsWith("//"));

/** Points bloquants avant une action : une phrase et un lien par point, tous les textes viennent des propriétés. */
export function ListeBloquants({ titre, points, vide }: ListeBloquantsProps) {
  const idTitre = useId();
  if (!Array.isArray(points) || points.length === 0) {
    return (
      <section className="axion-liste-bloquants" aria-labelledby={idTitre}>
        <h2 id={idTitre} className="axion-liste-bloquants__titre">
          {titre}
        </h2>
        <p className="axion-liste-bloquants__vide">{vide}</p>
      </section>
    );
  }
  return (
    <section className="axion-liste-bloquants" role="alert" aria-labelledby={idTitre}>
      <h2 id={idTitre} className="axion-liste-bloquants__titre">
        {titre}
      </h2>
      <ul className="axion-liste-bloquants__liste">
        {points.map((p) => (
          <li key={p.cle} className="axion-liste-bloquants__point">
            <p className="axion-liste-bloquants__phrase">{p.phrase}</p>
            {p.lien && hrefSur(p.lien.href) ? (
              <a className="axion-liste-bloquants__lien" href={p.lien.href}>
                {p.lien.libelle}
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
