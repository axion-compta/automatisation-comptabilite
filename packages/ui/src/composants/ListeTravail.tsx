import { useId } from "react";
import { EtatVide } from "./Etats.js";
import { Tableau, type ColonneTableau, type PaginationTableau } from "./Tableau.js";

/** Formule A imposée : toute autre chaîne est refusée à la compilation. */
export type MentionListeTravail = "document de travail, ne remplace pas le registre légal";

export type ListeTravailProps<L> = P<L>;

interface P<L> {
  mention: MentionListeTravail;
  titre: string;
  type: "associes" | "decisions" | "mouvements_titres";
  colonnes: ColonneTableau<L>[];
  lignes: L[];
  cleDeLigne(ligne: L): string;
  texteVide: string;
  pagination?: PaginationTableau;
}

export const ListeTravail = <L,>(p: P<L>) => {
  const { mention, titre, type, colonnes, lignes, cleDeLigne, texteVide, pagination } = p;
  const idMention = useId();
  return (
    <section className="axion-liste-travail" data-type={type} role="group" aria-describedby={idMention}>
      <p id={idMention} className="axion-liste-travail__mention">
        {mention}
      </p>
      {lignes.length === 0 ? (
        <EtatVide titre={texteVide} />
      ) : (
        <Tableau legende={titre} colonnes={colonnes} lignes={lignes} cleDeLigne={cleDeLigne} {...(pagination ? { pagination } : {})} />
      )}
    </section>
  );
};
