import { Fragment, useId } from "react";
import { centimes } from "../../../noyau/src/argent/index.js";
import { Montant } from "./Montant.js";

export interface TroisMontantsTvaProps {
  deduits: number;
  enAttente: number;
  perdus: number;
  libelles: { titre: string; deduits: string; enAttente: string; perdus: string };
}

/** Les trois montants de TVA, toujours affichés (même à zéro), dans un ordre fixe. Textes par propriétés. */
export function TroisMontantsTva({ deduits, enAttente, perdus, libelles }: TroisMontantsTvaProps) {
  const idTitre = useId();
  const lignes = [
    { cle: "deduits", libelle: libelles.deduits, valeur: deduits },
    { cle: "enAttente", libelle: libelles.enAttente, valeur: enAttente },
    { cle: "perdus", libelle: libelles.perdus, valeur: perdus },
  ];
  return (
    <section aria-labelledby={idTitre}>
      <h2 id={idTitre}>{libelles.titre}</h2>
      <dl>
        {lignes.map((l) => (
          <Fragment key={l.cle}>
            <dt>{l.libelle}</dt>
            <dd>
              <Montant centimes={centimes(l.valeur)} />
            </dd>
          </Fragment>
        ))}
      </dl>
    </section>
  );
}
