// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ChampSource, hrefSur, type ChampSourceProps } from "../ChampSource.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LIBELLES = {
  statut: { confirme: "Confirmé", a_confirmer: "À confirmer", vide: "Non renseigné", je_ne_sais_pas: "Vous ne savez pas" },
  confiance: { sur: "Sûr", a_verifier: "À vérifier", douteux: "Douteux" },
  voirLaSource: "Voir la source",
  vide: "Non renseigné",
};
const conteneurs: HTMLElement[] = [];

async function monter(props: Partial<ChampSourceProps>): Promise<HTMLElement> {
  const conteneur = document.createElement("div");
  document.body.appendChild(conteneur);
  conteneurs.push(conteneur);
  const element: ReactNode = <ChampSource intitule="Nom fictif" valeur="Société Exemple" statut="confirme" libelles={LIBELLES} {...props} />;
  await act(async () => {
    createRoot(conteneur).render(element);
  });
  return conteneur;
}

afterEach(() => {
  for (const c of conteneurs.splice(0)) c.remove();
});

describe("ChampSource", () => {
  it("affiche-valeur-et-intitule", async () => {
    const c = await monter({});
    const groupe = c.querySelector('[role="group"]')!;
    expect(c.querySelector(`#${CSS.escape(groupe.getAttribute("aria-labelledby")!)}`)?.textContent).toBe("Nom fictif");
    expect(c.textContent).toContain("Société Exemple");
  });

  it("statut-annonce", async () => {
    for (const [statut, texte] of Object.entries(LIBELLES.statut)) {
      const c = await monter({ statut: statut as ChampSourceProps["statut"], valeur: "x" });
      expect(c.querySelector(".axion-pastille__texte")?.textContent).toBe(texte);
    }
  });

  it("confiance-en-mot", async () => {
    for (const [mot, texte] of Object.entries(LIBELLES.confiance)) {
      const c = await monter({ confiance: mot as "sur" });
      expect(c.textContent).toContain(texte);
      expect(c.textContent).not.toContain("%");
    }
    expect((await monter({})).querySelectorAll(".axion-pastille")).toHaveLength(1);
  });

  it("lien-source-present", async () => {
    for (const href of ["/pieces/fictive-001#page=1", "./piece.pdf", "https://exemple.fr/piece"]) {
      const a = (await monter({ source: { href, libelle: "Pièce 1, page 1" } })).querySelector("a")!;
      expect(a.textContent).toBe("Voir la source");
      expect(a.getAttribute("href")).toBe(href);
    }
  });

  it("sans-source-pas-de-lien", async () => {
    expect((await monter({})).querySelector("a")).toBeNull();
    expect((await monter({ source: null })).querySelector("a")).toBeNull();
  });

  it("href-dangereux-ignore", async () => {
    const mauvais = ["javascript:alert(1)", "data:text/html,x", "", "  ", "//exemple.fr/x", "http://exemple.fr", " JavaScript:alert(1)", "java\tscript:alert(1)", "\\\\exemple.fr"];
    for (const href of mauvais) {
      expect((await monter({ source: { href, libelle: "x" } })).querySelector("a"), href).toBeNull();
      expect(hrefSur(href), href).toBeNull();
    }
    expect(hrefSur(undefined)).toBeNull();
    expect(hrefSur(42)).toBeNull();
  });

  it("valeur-vide-libelle-vide", async () => {
    for (const valeur of ["", "   ", null, undefined, false]) {
      const c = await monter({ valeur, statut: "vide" });
      expect(c.querySelector(".axion-champ-source__valeur")?.textContent).toBe("Non renseigné");
    }
    expect((await monter({ valeur: 0 })).querySelector(".axion-champ-source__valeur")?.textContent).toBe("0");
  });
});
