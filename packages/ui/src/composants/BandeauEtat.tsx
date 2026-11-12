import "./bandeau-etat.css";

export type NiveauBandeau = "info" | "attention" | "panne";

export interface BandeauEtatProps {
  niveau: NiveauBandeau;
  texte: string;
  action?: { libelle: string; onClick(): void };
}

const ICONES: Record<NiveauBandeau, string> = { info: "i", attention: "!", panne: "×" };

/** Bandeau d'état : icône et texte (jamais la couleur seule) ; la panne est annoncée tout de suite (`alert`). */
export function BandeauEtat({ niveau, texte, action }: BandeauEtatProps) {
  if (!(niveau in ICONES)) throw new Error("niveau_bandeau_inconnu");
  if (typeof texte !== "string" || texte.trim() === "") throw new Error("texte_bandeau_vide");
  return (
    <div className={`axion-bandeau-etat axion-bandeau-etat--${niveau}`} role={niveau === "panne" ? "alert" : "status"}>
      <span className="axion-bandeau-etat__icone" data-icone={niveau} aria-hidden="true">
        {ICONES[niveau]}
      </span>
      <span className="axion-bandeau-etat__texte">{texte}</span>
      {action ? (
        <button type="button" className="axion-bandeau-etat__action" onClick={action.onClick}>
          {action.libelle}
        </button>
      ) : null}
    </div>
  );
}
