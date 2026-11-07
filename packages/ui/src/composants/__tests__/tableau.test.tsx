// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Tableau, type PaginationTableau, type TableauProps } from "../Tableau.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface Ligne {
  id: string;
  nom: string;
  montant: string;
}

const lignes: Ligne[] = [
  { id: "a", nom: "Alice Exemple", montant: "10" },
  { id: "b", nom: "Bruno Exemple", montant: "20" },
];

const conteneurs: HTMLElement[] = [];

async function monter(element: ReactNode): Promise<HTMLElement> {
  const conteneur = document.createElement("div");
  document.body.appendChild(conteneur);
  conteneurs.push(conteneur);
  await act(async () => {
    createRoot(conteneur).render(element);
  });
  return conteneur;
}

afterEach(() => {
  for (const c of conteneurs.splice(0)) c.remove();
});

function props(sur: Partial<TableauProps<Ligne>> = {}): TableauProps<Ligne> {
  return {
    legende: "Liste des tiers",
    colonnes: [
      { cle: "nom", entete: "Nom", rendu: (l) => l.nom, triable: true },
      { cle: "montant", entete: "Montant", rendu: (l) => l.montant, alignement: "droite" },
    ],
    lignes,
    cleDeLigne: (l) => l.id,
    ...sur,
  };
}

function pagination(sur: Partial<PaginationTableau> = {}): PaginationTableau {
  return {
    decalage: 0,
    limite: 2,
    total: 6,
    libellePrecedent: "Précédent",
    libelleSuivant: "Suivant",
    resume: (d, f, t) => `${d} à ${f} sur ${t}`,
    surPage: () => {},
    ...sur,
  };
}

describe("tableau accessible", () => {
  it("legende-nom-accessible", async () => {
    const c = await monter(<Tableau {...props()} />);
    const caption = c.querySelector("table > caption");
    expect(caption?.textContent).toBe("Liste des tiers");
  });

  it("entetes-scope-col", async () => {
    const c = await monter(<Tableau {...props()} />);
    const ths = [...c.querySelectorAll("thead th")];
    expect(ths).toHaveLength(2);
    for (const th of ths) expect(th.getAttribute("scope")).toBe("col");
  });

  it("tri-aria-sort", async () => {
    const c = await monter(<Tableau {...props({ tri: { cle: "nom", sens: "descending" } })} />);
    const [nom, montant] = [...c.querySelectorAll("thead th")];
    expect(nom?.getAttribute("aria-sort")).toBe("descending");
    expect(montant?.hasAttribute("aria-sort")).toBe(false);
    const c2 = await monter(<Tableau {...props({ tri: { cle: "nom", sens: "ascending" } })} />);
    expect(c2.querySelector("thead th")?.getAttribute("aria-sort")).toBe("ascending");
    const c3 = await monter(<Tableau {...props()} />);
    expect(c3.querySelector("thead th")?.getAttribute("aria-sort")).toBe("none");
    const c4 = await monter(<Tableau {...props({ tri: { cle: "montant", sens: "ascending" } })} />);
    expect(c4.querySelector("thead th")?.getAttribute("aria-sort")).toBe("none");
  });

  it("clic-tri-appelle-surTri", async () => {
    const surTri = vi.fn();
    const c = await monter(<Tableau {...props({ surTri })} />);
    expect(c.querySelectorAll("thead button")).toHaveLength(1);
    await act(async () => {
      c.querySelector<HTMLButtonElement>("thead button")?.click();
    });
    expect(surTri).toHaveBeenCalledWith({ cle: "nom", sens: "ascending" });
    const surTri2 = vi.fn();
    const c2 = await monter(<Tableau {...props({ surTri: surTri2, tri: { cle: "nom", sens: "ascending" } })} />);
    await act(async () => {
      c2.querySelector<HTMLButtonElement>("thead button")?.click();
    });
    expect(surTri2).toHaveBeenCalledWith({ cle: "nom", sens: "descending" });
    // le composant ne trie pas : l'ordre des lignes reste celui reçu
    const noms = [...c2.querySelectorAll("tbody tr td:first-child")].map((td) => td.textContent);
    expect(noms).toEqual(["Alice Exemple", "Bruno Exemple"]);
  });

  it("pagination-bornes-desactivees", async () => {
    const surPage = vi.fn();
    const debut = await monter(<Tableau {...props({ pagination: pagination({ surPage }) })} />);
    const [prec, suiv] = [...debut.querySelectorAll<HTMLButtonElement>(".axion-tableau__pagination button")];
    expect(prec?.disabled).toBe(true);
    expect(suiv?.disabled).toBe(false);
    await act(async () => {
      suiv?.click();
    });
    expect(surPage).toHaveBeenCalledWith(2);

    const fin = await monter(<Tableau {...props({ pagination: pagination({ decalage: 4, surPage }) })} />);
    const [p2, s2] = [...fin.querySelectorAll<HTMLButtonElement>(".axion-tableau__pagination button")];
    expect(p2?.disabled).toBe(false);
    expect(s2?.disabled).toBe(true);
    await act(async () => {
      p2?.click();
    });
    expect(surPage).toHaveBeenLastCalledWith(2);

    const vide = await monter(<Tableau {...props({ lignes: [], pagination: pagination({ total: 0 }) })} />);
    const bs = [...vide.querySelectorAll<HTMLButtonElement>(".axion-tableau__pagination button")];
    expect(bs.map((b) => b.disabled)).toEqual([true, true]);

    const exact = await monter(<Tableau {...props({ pagination: pagination({ total: 2 }) })} />);
    const be = [...exact.querySelectorAll<HTMLButtonElement>(".axion-tableau__pagination button")];
    expect(be.map((b) => b.disabled)).toEqual([true, true]);
  });

  it("resume-aria-live", async () => {
    const c = await monter(<Tableau {...props({ pagination: pagination({ decalage: 4 }) })} />);
    const zone = c.querySelector('[aria-live="polite"]');
    expect(zone?.textContent).toBe("5 à 6 sur 6");
    const v = await monter(<Tableau {...props({ lignes: [], pagination: pagination({ total: 0 }) })} />);
    expect(v.querySelector('[aria-live="polite"]')?.textContent).toBe("0 à 0 sur 0");
  });

  it("cellule-data-entete", async () => {
    const c = await monter(<Tableau {...props()} />);
    const cellules = [...c.querySelectorAll("tbody tr:first-child td")];
    expect(cellules.map((td) => td.getAttribute("data-entete"))).toEqual(["Nom", "Montant"]);
    expect(cellules[1]?.className).toContain("axion-tableau__cellule--droite");
  });
});
