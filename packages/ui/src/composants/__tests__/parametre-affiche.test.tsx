// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ParametreAffiche, type ParametreAfficheProps } from "../ParametreAffiche.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LIBELLES = { aVerifier: "LIB-VERIF", source: "LIB-SRC", releveLe: "LIB-DATE" };
const BASE: ParametreAfficheProps = {
  valeur: "VAL-123",
  aVerifier: false,
  source: { titre: "Article fictif 42", url: "https://exemple.fr/article-42" },
  dateReleve: "2026-11-06",
  libelles: LIBELLES,
};
const conteneurs: HTMLElement[] = [];

async function monter(props: Partial<ParametreAfficheProps>): Promise<HTMLElement> {
  const conteneur = document.createElement("div");
  document.body.appendChild(conteneur);
  conteneurs.push(conteneur);
  await act(async () => {
    createRoot(conteneur).render(<ParametreAffiche {...BASE} {...props} />);
  });
  return conteneur;
}

afterEach(() => {
  for (const c of conteneurs.splice(0)) c.remove();
});

describe("ParametreAffiche", () => {
  it("a-verifier-p20", async () => {
    const c = await monter({ aVerifier: true });
    expect(c.textContent).toContain("VAL-123");
    expect(c.querySelector(".axion-pastille__texte")?.textContent).toBe("LIB-VERIF");
    expect(c.textContent).toContain("Article fictif 42");
    expect(c.textContent).toContain("LIB-DATE 06/11/2026");
  });

  it("valide-sans-pastille", async () => {
    const c = await monter({});
    expect(c.querySelector(".axion-pastille")).toBeNull();
    expect(c.textContent).not.toContain("LIB-VERIF");
  });

  it("source-en-lien-https", async () => {
    const a = (await monter({})).querySelector("a")!;
    expect(a.getAttribute("href")).toBe("https://exemple.fr/article-42");
    expect(a.textContent).toBe("Article fictif 42");
  });

  it("url-non-https-texte-simple", async () => {
    for (const url of ["http://exemple.fr", "javascript:alert(1)", "data:text/html,x", "", "/chemin", "https://exemple.fr/a b"]) {
      const c = await monter({ source: { titre: "Titre fictif", url } });
      expect(c.querySelector("a"), url).toBeNull();
      expect(c.textContent, url).toContain("Titre fictif");
    }
  });

  it("date-mal-formee-jamais-invalid-date", async () => {
    for (const dateReleve of ["2026-02-30", "", "06/11/2026", "2026-13-01", "n'importe quoi", undefined as unknown as string]) {
      const c = await monter({ dateReleve });
      expect(c.textContent, dateReleve).not.toContain("Invalid Date");
      expect(c.textContent, dateReleve).not.toContain("LIB-DATE");
      expect(c.querySelector(".axion-pastille__texte")?.textContent, dateReleve).toBe("LIB-VERIF");
    }
  });

  it("aucun-texte-en-dur", async () => {
    const autres = { aVerifier: "AAA", source: "BBB", releveLe: "CCC" };
    const c = await monter({ aVerifier: true, libelles: autres });
    expect(c.textContent).toBe("VAL-123AAABBB Article fictif 42CCC 06/11/2026");
    expect(c.textContent).not.toMatch(/LIB-|vérifier|Source|Relevé/i);
  });
});
