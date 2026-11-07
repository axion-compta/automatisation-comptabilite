import { useState } from "react";
import { validerCarte, type Carte } from "../../../contrat/src/chat/cartes.js";
import { centimes } from "../../../noyau/src/argent/index.js";
import { Bouton } from "./Bouton.js";
import { EtatErreur, EtatVide } from "./Etats.js";
import { Montant } from "./Montant.js";

export interface SourceCarte {
  type: string;
  id: string;
}

export interface LibellesRenduCarte {
  indisponible: string;
  vide: string;
  voirTout: string;
  telecharger: string;
  types: Record<Carte["type"], string>;
}

export interface RenduCarteProps {
  brut: unknown;
  libelles: LibellesRenduCarte;
  onOuvrir: (source: SourceCarte) => void;
}

const LIMITE_LISTE = 50;

function Liste({ elements, libelles }: { elements: { libelle: string }[]; libelles: LibellesRenduCarte }) {
  const [tout, setTout] = useState(false);
  if (elements.length === 0) return <EtatVide titre={libelles.vide} />;
  const visibles = tout ? elements : elements.slice(0, LIMITE_LISTE);
  return (
    <>
      <ul className="axion-rendu-carte__liste">
        {visibles.map((e, i) => (
          <li key={i}>{e.libelle}</li>
        ))}
      </ul>
      {!tout && elements.length > LIMITE_LISTE ? (
        <Bouton variante="discret" onClick={() => setTout(true)}>
          {libelles.voirTout}
        </Bouton>
      ) : null}
    </>
  );
}

type CorpsProps = Pick<RenduCarteProps, "libelles" | "onOuvrir"> & { carte: Carte };

function Corps({ carte, libelles, onOuvrir }: CorpsProps) {
  switch (carte.type) {
    case "liste":
      return <Liste elements={carte.elements} libelles={libelles} />;
    case "tva":
      return <Montant centimes={centimes(carte.montant_centimes)} />;
    case "telechargement":
      return (
        <Bouton variante="discret" onClick={() => onOuvrir(carte.source)}>
          {libelles.telecharger}
        </Bouton>
      );
    default:
      return (
        <p className="axion-rendu-carte__ligne">
          <span>{carte.libelle}</span> <Montant centimes={centimes(carte.montant_centimes)} />
        </p>
      );
  }
}

/** Rend une carte du chat. La validation est faite ICI : le parent n'est jamais cru. */
export function RenduCarte({ brut, libelles, onOuvrir }: RenduCarteProps) {
  const carte = validerCarte(brut);
  if (carte.type === "indisponible") return <EtatErreur message={libelles.indisponible} />;
  return (
    <section className="axion-rendu-carte" data-type={carte.type} aria-label={libelles.types[carte.type]}>
      <h3 className="axion-rendu-carte__titre">{libelles.types[carte.type]}</h3>
      <Corps carte={carte} libelles={libelles} onOuvrir={onOuvrir} />
    </section>
  );
}
