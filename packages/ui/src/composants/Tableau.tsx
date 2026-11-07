import type { ReactNode } from "react";

export type SensDeTri = "ascending" | "descending";

export interface ColonneTableau<L> {
  cle: string;
  entete: string;
  rendu(ligne: L): ReactNode;
  alignement?: "gauche" | "droite";
  triable?: boolean;
}

export interface TriTableau {
  cle: string;
  sens: SensDeTri;
}

export interface PaginationTableau {
  decalage: number;
  limite: number;
  total: number;
  libellePrecedent: string;
  libelleSuivant: string;
  resume(debut: number, fin: number, total: number): string;
  surPage(decalage: number): void;
}

export type CleDeLigne = string;

export interface TableauProps<L> {
  legende: string;
  colonnes: ColonneTableau<L>[];
  lignes: L[];
  cleDeLigne(ligne: L): CleDeLigne;
  tri?: TriTableau;
  surTri?(tri: TriTableau): void;
  pagination?: PaginationTableau;
}

const SANS_TRI = "none" as const;

/** Tableau accessible. Le tri et la pagination sont faits par l'appelant ou le serveur : rien n'est trié ici. */
export function Tableau< L>(props: TableauProps<L>) {
  const { legende, colonnes, lignes, cleDeLigne, tri, surTri, pagination } = props;
  const trier = (cle: string) => {
    const sens: SensDeTri = tri && tri.cle === cle && tri.sens === "ascending" ? "descending" : "ascending";
    if (surTri) surTri({ cle, sens });
  };
  const classeCellule = (c: ColonneTableau<L>) =>
    c.alignement === "droite" ? "axion-tableau__cellule axion-tableau__cellule--droite" : "axion-tableau__cellule";
  let navigation: ReactNode = null;
  if (pagination) {
    const { decalage, limite, total } = pagination;
    const entier = (n: number) => Number.isSafeInteger(n);
    const valide = entier(decalage) && decalage >= 0 && entier(limite) && limite > 0 && entier(total) && total >= 0;
    const totalAffiche = valide ? total : 0;
    const debut = !valide || total === 0 ? 0 : Math.min(decalage + 1, total);
    const fin = valide ? Math.min(decalage + limite, total) : 0;
    navigation = (
      <div className="axion-tableau__pagination">
        <button
          type="button"
          className="axion-tableau__page"
          disabled={!valide || decalage <= 0}
          onClick={() => pagination.surPage(Math.max(0, decalage - limite))}
        >
          {pagination.libellePrecedent}
        </button>
        <span className="axion-tableau__resume" aria-live="polite">
          {pagination.resume(debut, fin, totalAffiche)}
        </span>
        <button
          type="button"
          className="axion-tableau__page"
          disabled={!valide || decalage + limite >= total}
          onClick={() => pagination.surPage(decalage + limite)}
        >
          {pagination.libelleSuivant}
        </button>
      </div>
    );
  }
  return (
    <div className="axion-tableau">
      <table className="axion-tableau__table" role="table">
        <caption className="axion-tableau__legende">{legende}</caption>
        <thead role="rowgroup">
          <tr role="row">
            {colonnes.map((c) => (
              <th
                key={c.cle}
                scope="col"
                role="columnheader"
                className={classeCellule(c)}
                aria-sort={c.triable ? (tri && tri.cle === c.cle ? tri.sens : SANS_TRI) : undefined}
              >
                {c.triable ? (
                  <button
                    type="button"
                    className="axion-tableau__tri"
                    onClick={() => trier(c.cle)}
                  >
                    {c.entete}
                  </button>
                ) : (
                  c.entete
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {lignes.map((ligne) => (
            <tr key={cleDeLigne(ligne)} className="axion-tableau__ligne" role="row">
              {colonnes.map((c) => (
                <td key={c.cle} className={classeCellule(c)} data-entete={c.entete} role="cell">
                  {c.rendu(ligne)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {navigation}
    </div>
  );
}
