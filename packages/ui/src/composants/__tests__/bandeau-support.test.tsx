// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { BandeauSupport } from "../BandeauSupport.js";

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

const dossier = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("BandeauSupport", () => {
  it("inactif-rien", async () => {
    const c = await monter(<BandeauSupport texte="Texte fictif" actif={false} />);
    expect(c.innerHTML).toBe("");
    expect((await monter(<BandeauSupport texte="" actif={false} />)).innerHTML).toBe("");
  });

  it("actif-role-status", async () => {
    const c = await monter(<BandeauSupport texte="Texte fictif" actif />);
    const regions = c.querySelectorAll('[role="status"]');
    expect(regions).toHaveLength(1);
    expect(regions[0]!.getAttribute("tabindex")).toBeNull();
    expect(regions[0]!.className).toBe("axion-bandeau-support");
  });

  it("texte-affiche-tel-quel", async () => {
    for (const t of ["Lecture jusqu’à 14:30 <b>&amp;</b> « fictif »", "x".repeat(2000), "  espaces  "]) {
      const c = await monter(<BandeauSupport texte={t} actif />);
      expect(c.querySelector('[role="status"]')!.textContent).toBe(t);
      expect(c.querySelector("b")).toBeNull();
    }
  });

  it("aucun-bouton-de-fermeture", async () => {
    const c = await monter(<BandeauSupport texte="Texte fictif" actif />);
    expect(c.querySelectorAll("button, a, input, [role='button'], [tabindex]")).toHaveLength(0);
    const source = readFileSync(join(dossier, "BandeauSupport.tsx"), "utf-8");
    expect(source).not.toMatch(/onClick|useState|<button/);
    const css = readFileSync(join(dossier, "bandeau-support.css"), "utf-8");
    expect(css).toContain("var(--");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/i);
    expect(css).not.toMatch(/font-weight:\s*(7|8|9)00|font-weight:\s*bold/);
  });

  it("texte-vide-leve-une-erreur", () => {
    for (const t of ["", "   ", "\n\t", undefined, null]) {
      expect(() => BandeauSupport({ texte: t as unknown as string, actif: true })).toThrow("texte_bandeau_vide");
    }
    expect(BandeauSupport({ texte: "", actif: false })).toBeNull();
  });
});
