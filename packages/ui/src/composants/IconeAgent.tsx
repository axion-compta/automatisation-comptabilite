/** Spécialités d'agent : liste fermée. Une fonction, jamais un prénom ni un visage. */
export const SPECIALITES = ["lecture", "banque", "tva", "controle", "chat"] as const;
export type Specialite = (typeof SPECIALITES)[number];

export type LibellesSpecialites = Record<Specialite | "neutre", string>;

export interface IconeAgentProps {
  specialite: string | undefined;
  libelles: LibellesSpecialites;
}

/** Formes distinctes ; la couleur vient de currentColor (jetons), jamais d'une valeur en dur. */
const FORMES: Record<Specialite | "neutre", string> = {
  lecture: "M3 2h7l3 3v9H3zM10 2v3h3M5 8h6M5 11h6",
  banque: "M2 6l6-3 6 3M3 7v5M6.5 7v5M9.5 7v5M13 7v5M2 14h12",
  tva: "M4 12L12 4M5 5.5h.01M11 10.5h.01",
  controle: "M3 8.5L6.5 12 13 4.5M2 2h12v12H2z",
  chat: "M2 3h12v8H7l-3 3v-3H2z",
  neutre: "M8 3v1M8 7v5M3 8h10",
};

const estSpecialite = (s: string | undefined): s is Specialite => s !== undefined && (SPECIALITES as readonly string[]).includes(s);

export function IconeAgent({ specialite, libelles }: IconeAgentProps) {
  const cle = estSpecialite(specialite) ? specialite : "neutre";
  return (
    <span className="axion-icone-agent" role="img" aria-label={libelles[cle]}>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
        <path d={FORMES[cle]} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
