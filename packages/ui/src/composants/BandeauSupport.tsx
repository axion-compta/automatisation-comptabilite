import "./bandeau-support.css";

export interface BandeauSupportProps {
  texte: string;
  actif: boolean;
}

/** Bandeau montré au client tant que le bail de lecture du support court : aucune fermeture possible. */
export function BandeauSupport({ texte, actif }: BandeauSupportProps) {
  if (!actif) return null;
  if (typeof texte !== "string" || texte.trim() === "") throw new Error("texte_bandeau_vide");
  return (
    <div className="axion-bandeau-support" role="status">
      {texte}
    </div>
  );
}
