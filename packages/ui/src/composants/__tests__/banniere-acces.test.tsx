// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { BanniereAcces } from "../BanniereAcces.js";

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

const base = { titre: "Titre A", consequence: "Conséquence B", gravite: "info" as const };

describe("BanniereAcces", () => {
  it("role-status-et-titre-relie", async () => {
    const c = await monter(<BanniereAcces {...base} />);
    const s = c.querySelector("section")!;
    expect(s.getAttribute("role")).toBe("status");
    expect(c.querySelector('[role="alert"]')).toBeNull();
    const h2 = c.querySelector("h2")!;
    expect(h2.textContent).toBe("Titre A");
    expect(h2.id).not.toBe("");
    expect(s.getAttribute("aria-labelledby")).toBe(h2.id);
    expect(c.textContent).toContain("Conséquence B");
    const deux = await monter(<BanniereAcces {...base} gravite="attention" />);
    expect(deux.querySelector("section")!.getAttribute("data-gravite")).toBe("attention");
    expect(c.querySelector("section")!.getAttribute("data-gravite")).toBe("info");
    expect(deux.querySelector("h2")!.id).not.toBe(h2.id);
  });

  it("lien-https-rendu", async () => {
    const c = await monter(<BanniereAcces {...base} lien={{ libelle: "Aller", href: "https://exemple.invalid/p" }} />);
    const a = c.querySelector("a")!;
    expect(a.getAttribute("href")).toBe("https://exemple.invalid/p");
    expect(a.textContent).toBe("Aller");
  });

  it("lien-sans-href-valide-texte-simple", async () => {
    for (const href of [null, "javascript:alert(1)", "http://exemple.invalid", "", "HTTPS://exemple.invalid", " https://exemple.invalid"]) {
      const c = await monter(<BanniereAcces {...base} lien={{ libelle: "Texte du lien", href }} />);
      expect(c.querySelector("a"), String(href)).toBeNull();
      expect(c.textContent).toContain("Texte du lien");
    }
  });

  it("resume-vide-non-rendu", async () => {
    const vide = await monter(<BanniereAcces {...base} resume="" />);
    const absent = await monter(<BanniereAcces {...base} />);
    const plein = await monter(<BanniereAcces {...base} resume="Résumé R" />);
    expect(vide.textContent).not.toContain("Résumé");
    expect(vide.querySelectorAll("p").length).toBe(absent.querySelectorAll("p").length);
    expect(plein.textContent).toContain("Résumé R");
    expect(plein.querySelectorAll("p").length).toBe(absent.querySelectorAll("p").length + 1);
  });

  it("prochaine-etape-optionnelle", async () => {
    const sans = await monter(<BanniereAcces {...base} />);
    const avec = await monter(<BanniereAcces {...base} prochaineEtape="Étape P" />);
    expect(sans.textContent).not.toContain("Étape P");
    expect(avec.textContent).toContain("Étape P");
    expect(avec.querySelectorAll("p").length).toBe(sans.querySelectorAll("p").length + 1);
    const vide = await monter(<BanniereAcces {...base} prochaineEtape="" />);
    expect(vide.querySelectorAll("p").length).toBe(sans.querySelectorAll("p").length);
  });

  it("aucun-texte-en-dur", async () => {
    const c = await monter(<BanniereAcces titre="" consequence="" prochaineEtape="" resume="" lien={{ libelle: "", href: null }} gravite="info" />);
    const noeuds: string[] = [];
    const parcours = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (parcours.nextNode()) noeuds.push(parcours.currentNode.textContent ?? "");
    expect(noeuds.filter((t) => t.trim() !== "")).toEqual([]);
    expect(c.querySelector("a")).toBeNull();
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "BanniereAcces.tsx"), "utf-8");
    expect(source).not.toMatch(/from ["'].*textes/);
  });

  it("css-sans-couleur-en-dur", () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "banniere-acces.css"), "utf-8");
    expect(css.length).toBeGreaterThan(100);
    expect(css).toContain("var(--");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/i);
    expect(css).toContain('[data-gravite="info"]');
    expect(css).toContain('[data-gravite="attention"]');
    expect(css).not.toMatch(/font-weight:\s*(7|8|9)00|font-weight:\s*bold/);
    expect(css).not.toMatch(/\b(red|blue|green|black|white|orange|yellow)\b/i);
  });
});
