// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BandeauDocument } from "../BandeauDocument.js";
import { Provenance } from "../Provenance.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const conteneurs: HTMLElement[] = [];
async function monter(element: ReactNode): Promise<HTMLElement> {
  const c = document.createElement("div");
  document.body.appendChild(c);
  conteneurs.push(c);
  await act(async () => {
    createRoot(c).render(element);
  });
  return c;
}
afterEach(() => {
  for (const c of conteneurs.splice(0)) c.remove();
  vi.restoreAllMocks();
});

const sources = [
  { ecritureId: "e1", libelle: "Facture Alpha", montant: 12345, lienEcriture: "/ecritures/e1" },
  { ecritureId: "e2", libelle: "Avoir Beta", montant: -5000 },
];
const props = { bouton: "Bouton B", vide: "Vide V", sources };
const cliquer = (c: HTMLElement) => act(async () => { c.querySelector("button")!.click(); });
const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../documents.css"), "utf8");

describe("Provenance", () => {
  it("provenance-fermee-par-defaut", async () => {
    const c = await monter(<Provenance {...props} />);
    const b = c.querySelector("button")!;
    expect(b.textContent).toBe("Bouton B");
    expect(b.getAttribute("aria-expanded")).toBe("false");
    expect(c.querySelector(`[id="${b.getAttribute("aria-controls")}"]`)!.hasAttribute("hidden")).toBe(true);
  });

  it("provenance-ouvre-et-annonce", async () => {
    const c = await monter(<Provenance {...props} />);
    await cliquer(c);
    const b = c.querySelector("button")!;
    expect(b.getAttribute("aria-expanded")).toBe("true");
    expect(c.querySelector(`[id="${b.getAttribute("aria-controls")}"]`)!.hasAttribute("hidden")).toBe(false);
    await cliquer(c);
    expect(c.querySelector("button")!.getAttribute("aria-expanded")).toBe("false");
  });

  it("provenance-liste-les-sources", async () => {
    const c = await monter(<Provenance {...props} />);
    const lignes = c.querySelectorAll("li");
    expect(lignes.length).toBe(2);
    expect(lignes[0]!.querySelector("a")!.getAttribute("href")).toBe("/ecritures/e1");
    expect(lignes[1]!.querySelector("a")).toBeNull();
    expect(lignes[0]!.textContent).toContain("Facture Alpha");
    expect(lignes[1]!.querySelector("[data-signe]")!.getAttribute("data-signe")).toBe("negatif");
    expect(lignes[1]!.textContent).toMatch(/[-−]/);
    expect(c.textContent).not.toContain("Vide V");
  });

  it("provenance-vide", async () => {
    const c = await monter(<Provenance {...props} sources={[]} />);
    expect(c.querySelectorAll("li").length).toBe(0);
    expect(c.textContent).toContain("Vide V");
  });

  it("provenance-liens-dangereux-et-longs-libelles", async () => {
    const long = "x".repeat(500);
    const c = await monter(<Provenance {...props} sources={[{ ecritureId: "e9", libelle: long, montant: 1, lienEcriture: "javascript:alert(1)" }]} />);
    expect(c.querySelector("a")).toBeNull();
    expect(c.querySelector(".axion-provenance__libelle")!.textContent).toBe(long);
    expect(css).toMatch(/\.axion-provenance__libelle[^}]*overflow-wrap: anywhere/);
  });

  it("provenance-200-sources-sans-avertissement", async () => {
    const erreurs = vi.spyOn(console, "error").mockImplementation(() => {});
    const beaucoup = Array.from({ length: 200 }, (_, i) => ({ ecritureId: `e${i}`, libelle: `L${i}`, montant: i }));
    const c = await monter(<Provenance {...props} sources={beaucoup} />);
    expect(c.querySelectorAll("li").length).toBe(200);
    expect(erreurs).not.toHaveBeenCalled();
  });
});

describe("BandeauDocument", () => {
  const b = { mention: "Mention M", texteFiligrane: "Filigrane F" };

  it("bandeau-mention-et-validateur", async () => {
    const c = await monter(<BandeauDocument {...b} mention="Préparé par IA, à valider. Validé par Alice Exemple le 01/02/2026" filigrane="a_valider" />);
    expect(c.querySelector(".axion-bandeau-document__mention")!.textContent).toContain("Validé par Alice Exemple");
  });

  it("bandeau-filigrane-indicatif", async () => {
    for (const f of ["a_valider", "indicatif", "non_officiel"] as const) {
      const c = await monter(<BandeauDocument {...b} filigrane={f} />);
      const fil = c.querySelector(".axion-filigrane")!;
      expect(fil.classList.contains(`axion-filigrane--${f}`)).toBe(true);
      expect(fil.getAttribute("aria-hidden")).toBe("true");
      expect(fil.textContent).toBe("Filigrane F");
      expect(c.querySelector(".axion-bandeau-document__lisible")!.textContent).toBe("Filigrane F");
    }
  });

  it("bandeau-sans-filigrane-si-valide", async () => {
    const c = await monter(<BandeauDocument {...b} filigrane="aucun" />);
    expect(c.querySelector(".axion-filigrane")).toBeNull();
    expect(c.querySelector(".axion-bandeau-document__lisible")).toBeNull();
    expect(c.textContent).toBe("Mention M");
  });

  it("css-sans-couleur-en-dur", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
    expect(css).not.toMatch(/font-weight:\s*(7|8|9)00|font-weight:\s*bold/);
  });
});
