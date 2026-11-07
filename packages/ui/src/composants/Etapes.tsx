export type EtatEtape = "en_cours" | "faite" | "echec";

export interface EtapesProps {
  titre: string;
  etapes: { libelle: string; etat: EtatEtape }[];
  /** Texte de chaque état, lu avec le libellé : l'état ne dépend jamais de la couleur seule. */
  libellesEtats: Record<EtatEtape, string>;
}

const ICONES: Record<EtatEtape, string> = { en_cours: "…", faite: "✓", echec: "✗" };

export function Etapes({ titre, etapes, libellesEtats }: EtapesProps) {
  return (
    <section className="axion-etapes" aria-live="polite">
      <h3 className="axion-etapes__titre">{titre}</h3>
      <ol className="axion-etapes__liste">
        {etapes.map((e, i) => (
          <li key={i} data-etat={e.etat}>
            <span aria-hidden="true">{ICONES[e.etat]}</span> {e.libelle} <span className="axion-etapes__etat">({libellesEtats[e.etat]})</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
