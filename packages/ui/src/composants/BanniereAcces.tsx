import { useId } from "react";
import "./banniere-acces.css";

export interface BanniereAccesProps {
  titre: string;
  consequence: string;
  prochaineEtape?: string;
  lien?: { libelle: string; href: string | null };
  resume?: string;
  gravite: "info" | "attention";
}

/** Bannière permanente d'état d'accès : tous les textes arrivent par les propriétés. */
export function BanniereAcces({ titre, consequence, prochaineEtape, lien, resume, gravite }: BanniereAccesProps) {
  const idTitre = useId();
  const lienValide = lien?.href != null && lien.href.startsWith("https:");
  return (
    <section className="axion-banniere-acces" role="status" aria-labelledby={idTitre} data-gravite={gravite}>
      <h2 id={idTitre} className="axion-banniere-acces__titre">
        {titre}
      </h2>
      <p className="axion-banniere-acces__texte">{consequence}</p>
      {prochaineEtape ? <p className="axion-banniere-acces__texte">{prochaineEtape}</p> : null}
      {resume ? <p className="axion-banniere-acces__texte">{resume}</p> : null}
      {lien && lienValide ? (
        <a className="axion-banniere-acces__lien" href={lien.href as string}>
          {lien.libelle}
        </a>
      ) : lien && lien.libelle ? (
        <span className="axion-banniere-acces__lien">{lien.libelle}</span>
      ) : null}
    </section>
  );
}
