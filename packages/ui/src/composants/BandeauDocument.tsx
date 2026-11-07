// @ts-expect-error -- ce paquet n'a pas de déclaration de module pour les feuilles .css
import "./documents.css";

export type Filigrane = "aucun" | "a_valider" | "indicatif" | "non_officiel";

export interface BandeauDocumentProps {
  mention: string;
  filigrane: Filigrane;
  /** Texte du filigrane, lisible par les lecteurs d'écran dans le bandeau. */
  texteFiligrane: string;
}

/** Bandeau d'un document : mention (construite par l'appelant) et filigrane tant que non validé. */
export function BandeauDocument({ mention, filigrane, texteFiligrane }: BandeauDocumentProps) {
  const avec = filigrane !== "aucun";
  return (
    <div className="axion-bandeau-document" data-filigrane={filigrane}>
      <p className="axion-bandeau-document__mention">{mention}</p>
      {avec ? <span className="axion-bandeau-document__lisible">{texteFiligrane}</span> : null}
      {avec ? (
        <span className={`axion-filigrane axion-filigrane--${filigrane}`} aria-hidden="true">
          {texteFiligrane}
        </span>
      ) : null}
    </div>
  );
}
