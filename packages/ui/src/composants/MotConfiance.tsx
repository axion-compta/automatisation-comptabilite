import { Pastille, type EtatPastille } from "./Pastille.js";

/** Échelle unique de confiance : aucun pourcentage à l'écran. */
export type MotConfiance = "sur" | "a_verifier" | "douteux";

export interface MotConfianceProps {
  mot: MotConfiance;
  libelles: Record<MotConfiance, string>;
}

const ETAT_PAR_MOT: Record<MotConfiance, EtatPastille> = {
  sur: "ok",
  a_verifier: "attente",
  douteux: "bloque",
};

export function MotConfiance({ mot, libelles }: MotConfianceProps) {
  return <Pastille etat={ETAT_PAR_MOT[mot]} libelle={libelles[mot]} />;
}
