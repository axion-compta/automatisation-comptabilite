import { useId, useState } from "react";
import { centimes } from "../../../noyau/src/argent/index.js";
import { Montant } from "./Montant.js";
// @ts-expect-error -- ce paquet n'a pas de déclaration de module pour les feuilles .css
import "./documents.css";

export interface SourceMontant {
  ecritureId: string;
  libelle: string;
  montant: number;
  lienEcriture?: string;
}

export interface ProvenanceProps {
  bouton: string;
  vide: string;
  sources: SourceMontant[];
}

const hrefSur = (h: string): boolean => h.startsWith("https:") || (h.startsWith("/") && !h.startsWith("//"));

/** « D'où vient ce montant ? » : liste repliable des écritures sources, tous les textes viennent des propriétés. */
export function Provenance({ bouton, vide, sources }: ProvenanceProps) {
  const [ouvert, setOuvert] = useState(false);
  const idListe = useId();
  return (
    <div className="axion-provenance">
      <button type="button" className="axion-provenance__bouton" aria-expanded={ouvert} aria-controls={idListe} onClick={() => setOuvert((o) => !o)}>
        {bouton}
      </button>
      <div id={idListe} hidden={!ouvert}>
        {sources.length === 0 ? (
          <p className="axion-provenance__vide">{vide}</p>
        ) : (
          <ul className="axion-provenance__liste">
            {sources.map((s) => (
              <li key={s.ecritureId} className="axion-provenance__source">
                {s.lienEcriture && hrefSur(s.lienEcriture) ? (
                  <a className="axion-provenance__libelle" href={s.lienEcriture}>{s.libelle}</a>
                ) : (
                  <span className="axion-provenance__libelle">{s.libelle}</span>
                )}
                <Montant centimes={centimes(s.montant)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
