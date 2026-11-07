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

export interface TableauProps<L> {
  legende: string;
  colonnes: ColonneTableau<L>[];
  lignes: L[];
  cleDeLigne(ligne: L): string;
  tri?: TriTableau;
  surTri?(tri: TriTableau): void;
  pagination?: PaginationTableau;
}

function ariaSort(colonne: { cle: string }, tri?: TriTableau): "ascending" | "descending" | "none" {
  return tri && tri.cle === colonne.cle ? tri.sens : "none";
}

/** Tableau accessible. Le tri et la pagination sont faits par l'appelant ou le serveur : rien n'est trié ici. */
export function Tableau<L>({ legende, colonnes, lignes, cleDeLigne, tri, surTri, pagination }: TableauProps<L>) {
  const classeCellule = (c: ColonneTableau<L>) =>
    c.alignement === "droite" ? "axion-tableau__cellule axion-tableau__cellule--droite" : "axion-tableau__cellule";
  let navigation: ReactNode = null;
  if (pagination) {
    const { decalage, limite, total } = pagination;
    const debut = total === 0 ? 0 : decalage + 1;
    const fin = Math.min(decalage + limite, total);
    navigation = (
      <div className="axion-tableau__pagination">
        <button
          type="button"
          className="axion-tableau__page"
          disabled={decalage <= 0}
          onClick={() => pagination.surPage(Math.max(0, decalage - limite))}
        >
          {pagination.libellePrecedent}
        </button>
        <span className="axion-tableau__resume" aria-live="polite">
          {pagination.resume(debut, fin, total)}
        </span>
        <button
          type="button"
          className="axion-tableau__page"
          disabled={decalage + limite >= total}
          onClick={() => pagination.surPage(decalage + limite)}
        >
          {pagination.libelleSuivant}
        </button>
      </div>
    );
  }
  return (
    <div className="axion-tableau">
      <table className="axion-tableau__table">
        <caption className="axion-tableau__legende">{legende}</caption>
        <thead>
          <tr>
            {colonnes.map((c) => (
              <th
                key={c.cle}
                scope="col"
                className={classeCellule(c)}
                aria-sort={c.triable ? ariaSort(c, tri) : undefined}
              >
                {c.triable ? (
                  <button
                    type="button"
                    className="axion-tableau__tri"
                    onClick={() =>
                      surTri?.({ cle: c.cle, sens: tri && tri.cle === c.cle && tri.sens === "ascending" ? "descending" : "ascending" })
                    }
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
        <tbody>
          {lignes.map((ligne) => (
            <tr key={cleDeLigne(ligne)} className="axion-tableau__ligne">
              {colonnes.map((c) => (
                <td key={c.cle} className={classeCellule(c)} data-entete={c.entete}>
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
