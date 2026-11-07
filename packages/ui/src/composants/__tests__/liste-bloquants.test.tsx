// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ListeBloquants } from "../ListeBloquants.js";

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
});

const points = [
  { cle: "k2", phrase: "Phrase Z", lien: { libelle: "Libellé Z", href: "/zone/z" } },
  { cle: "k1", phrase: "Phrase A" },
  { cle: "k3", phrase: "Phrase M", lien: { libelle: "Libellé M", href: "https://exemple.invalid/m" } },
];
const base = { titre: "Titre T", vide: "Vide V" };

describe("ListeBloquants", () => {
  it("une-ligne-par-point", async () => {
    const c = await monter(<ListeBloquants {...base} points={points} />);
    expect(c.querySelectorAll("ul > li").length).toBe(3);
    expect(c.querySelector("h2")!.textContent).toBe("Titre T");
    expect(c.textContent).not.toContain("Vide V");
  });

  it("alerte-annoncee", async () => {
    const c = await monter(<ListeBloquants {...base} points={points} />);
    const alertes = c.querySelectorAll('[role="alert"]');
    expect(alertes.length).toBe(1);
    expect(alertes[0]!.querySelector("ul")).not.toBeNull();
    expect(alertes[0]!.textContent).toContain("Phrase A");
  });

  it("vide-sans-alerte", async () => {
    for (const p of [[], undefined as never]) {
      const c = await monter(<ListeBloquants {...base} points={p} />);
      expect(c.querySelector('[role="alert"]')).toBeNull();
      expect(c.querySelector("ul")).toBeNull();
      expect(c.querySelector("li")).toBeNull();
      expect(c.textContent).toContain("Vide V");
    }
  });

  it("lien-accessible", async () => {
    const c = await monter(<ListeBloquants {...base} points={points} />);
    const liens = [...c.querySelectorAll("a")];
    expect(liens.map((a) => a.textContent)).toEqual(["Libellé Z", "Libellé M"]);
    expect(liens.map((a) => a.getAttribute("href"))).toEqual(["/zone/z", "https://exemple.invalid/m"]);
    for (const a of liens) expect(a.getAttribute("aria-label") ?? a.textContent).toBeTruthy();
    const dangereux = await monter(
      <ListeBloquants {...base} points={[{ cle: "x", phrase: "P", lien: { libelle: "L", href: "javascript:alert(1)" } }]} />,
    );
    expect(dangereux.querySelector("a")).toBeNull();
    expect(dangereux.textContent).toContain("P");
  });

  it("ordre-conserve", async () => {
    const c = await monter(<ListeBloquants {...base} points={points} />);
    const phrases = [...c.querySelectorAll("li")].map((li) => li.querySelector("p")!.textContent);
    expect(phrases).toEqual(["Phrase Z", "Phrase A", "Phrase M"]);
    const inverse = await monter(<ListeBloquants {...base} points={[...points].reverse()} />);
    expect([...inverse.querySelectorAll("li p")].map((p) => p.textContent)).toEqual(["Phrase M", "Phrase A", "Phrase Z"]);
  });

  it("aucun-texte-en-dur", async () => {
    const c = await monter(<ListeBloquants {...base} points={points} />);
    const noeuds: string[] = [];
    const parcours = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (parcours.nextNode()) noeuds.push((parcours.currentNode.textContent ?? "").trim());
    expect(noeuds.filter((t) => t !== "")).toEqual(["Titre T", "Phrase Z", "Libellé Z", "Phrase A", "Phrase M", "Libellé M"]);
    const vide = await monter(<ListeBloquants titre="" vide="" points={[]} />);
    expect(vide.textContent).toBe("");
    const dossier = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(dossier, "..", "ListeBloquants.tsx"), "utf-8");
    expect(source).not.toMatch(/from ["'].*textes/);
    const css = readFileSync(join(dossier, "..", "liste-bloquants.css"), "utf-8");
    expect(css).toContain("var(--");
    expect(css).toMatch(/min-height:\s*var\(--cible-min\)/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla)\(/i);
    expect(css).not.toMatch(/font-weight:\s*[6-9]\d\d|font-weight:\s*bold/);
  });
});
