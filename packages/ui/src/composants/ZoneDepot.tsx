import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { Bouton } from "./Bouton.js";

export type CanalDepot = "glisser" | "selecteur";
type Liste = ArrayLike<File> | null | undefined;
type EvtZone = DragEvent<HTMLDivElement>;
type EvtEntree = ChangeEvent<HTMLInputElement>;

export interface ZoneDepotProps {
  surFichiers: (fichiers: File[], canal: CanalDepot) => void;
  libelles: { zone: string; bouton: string; survol: string };
  desactive?: boolean;
}

/** Zone de dépôt : glisser-déposer, plus un bouton toujours présent (accessible au clavier). */
export function ZoneDepot({ surFichiers, libelles, desactive = false }: ZoneDepotProps) {
  const entree = useRef<HTMLInputElement>(null);
  const [survol, setSurvol] = useState(false);

  function rendre(liste: Liste, canal: CanalDepot) {
    const fichiers = liste ? Array.from(liste) : [];
    if (fichiers.length === 0) return;
    surFichiers(fichiers, canal);
  }

  function survoler(e: EvtZone) {
    if (desactive) return;
    e.preventDefault();
    setSurvol(true);
  }

  function deposer(e: EvtZone) {
    if (desactive) return;
    e.preventDefault();
    setSurvol(false);
    rendre(e.dataTransfer?.files, "glisser");
  }

  function choisir(e: EvtEntree) {
    if (desactive) return;
    rendre(e.target.files, "selecteur");
    e.target.value = "";
  }

  const classes = ["axion-zone-depot", survol && !desactive ? "axion-zone-depot--survol" : ""].filter(Boolean).join(" ");
  return (
    <div className={classes} onDragOver={survoler} onDragLeave={() => setSurvol(false)} onDrop={deposer}>
      <p className="axion-zone-depot__texte">{survol && !desactive ? libelles.survol : libelles.zone}</p>
      <input ref={entree} className="axion-zone-depot__entree" type="file" multiple disabled={desactive} tabIndex={-1} aria-hidden="true" onChange={choisir} />
      <Bouton desactive={desactive} onClick={() => entree.current?.click()}>
        {libelles.bouton}
      </Bouton>
    </div>
  );
}
