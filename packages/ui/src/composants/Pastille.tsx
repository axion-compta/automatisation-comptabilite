export type EtatPastille = "ok" | "attente" | "bloque";

export interface PastilleProps {
  etat: EtatPastille;
  libelle: string;
}

/** Formes distinctes par état : l'état n'est jamais dit par la couleur seule. */
const FORMES: Record<EtatPastille, string> = {
  ok: "M3 8.5 6.5 12 13 4.5",
  attente: "M8 3v5l3 2",
  bloque: "M4 4l8 8M12 4l-8 8",
};

export function Pastille({ etat, libelle }: PastilleProps) {
  return (
    <span className={`axion-pastille axion-pastille--${etat}`}>
      <svg className="axion-pastille__icone" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
        <path d={FORMES[etat]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="axion-pastille__texte">{libelle}</span>
    </span>
  );
}
