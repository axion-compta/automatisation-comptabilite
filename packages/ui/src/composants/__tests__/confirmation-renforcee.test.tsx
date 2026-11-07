// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmationRenforcee } from "../ConfirmationRenforcee.js";

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

const textes = { titre: "Titre T", caseACocher: "Case C", bouton: "Bouton B", annuler: "Annuler X" };
const fabrique = (p: Record<string, unknown> = {}) => (
  <ConfirmationRenforcee
    niveau="renforcee"
    nombre={42}
    totalCentimes={123456}
    comptes={["Compte A", "Compte B"]}
    textes={textes}
    onConfirmer={() => {}}
    onAnnuler={() => {}}
    {...p}
  />
);
const bouton = (c: HTMLElement, texte: string) => [...c.querySelectorAll("button")].find((b) => b.textContent === texte)!;
const caseA = (c: HTMLElement) => c.querySelector('input[type="checkbox"]') as HTMLInputElement | null;

describe("ConfirmationRenforcee", () => {
  it("simple-sans-case", async () => {
    const onConfirmer = vi.fn();
    const c = await monter(fabrique({ niveau: "simple", onConfirmer }));
    expect(caseA(c)).toBeNull();
    expect(c.textContent).not.toContain("Case C");
    expect(bouton(c, "Bouton B").disabled).toBe(false);
    await act(async () => bouton(c, "Bouton B").click());
    expect(onConfirmer).toHaveBeenCalledTimes(1);
    expect(c.textContent).toContain("42");
  });

  it("renforcee-bouton-desactive", async () => {
    const onConfirmer = vi.fn();
    const c = await monter(fabrique({ onConfirmer }));
    expect(caseA(c)!.checked).toBe(false);
    expect(bouton(c, "Bouton B").disabled).toBe(true);
    await act(async () => bouton(c, "Bouton B").click());
    expect(onConfirmer).not.toHaveBeenCalled();
  });

  it("case-cochee-active", async () => {
    const onConfirmer = vi.fn();
    const c = await monter(fabrique({ onConfirmer }));
    await act(async () => caseA(c)!.click());
    expect(bouton(c, "Bouton B").disabled).toBe(false);
    expect(c.querySelector("label")!.textContent).toBe("Case C");
    await act(async () => bouton(c, "Bouton B").click());
    expect(onConfirmer).toHaveBeenCalledTimes(1);
    await act(async () => caseA(c)!.click());
    expect(bouton(c, "Bouton B").disabled).toBe(true);
  });

  it("total-formate", async () => {
    const c = await monter(fabrique());
    expect(c.textContent).toContain("1\u202f234,56\u00a0€");
    const neg = await monter(fabrique({ totalCentimes: -500 }));
    expect(neg.textContent).toContain("\u22125,00\u00a0€");
    const zero = await monter(fabrique({ totalCentimes: 0 }));
    expect(zero.textContent).toContain("0,00\u00a0€");
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const invalide of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      await expect(monter(fabrique({ totalCentimes: invalide }))).rejects.toThrow();
    }
    erreur.mockRestore();
  });

  it("comptes-listes", async () => {
    const c = await monter(fabrique({ comptes: ["Compte Z", "Compte A", "Compte M"] }));
    expect([...c.querySelectorAll("ul li")].map((li) => li.textContent)).toEqual(["Compte Z", "Compte A", "Compte M"]);
    const vide = await monter(fabrique({ comptes: [] }));
    expect(vide.querySelector("li")).toBeNull();
  });

  it("annuler-appelle-onAnnuler", async () => {
    const onAnnuler = vi.fn();
    const onConfirmer = vi.fn();
    const c = await monter(fabrique({ onAnnuler, onConfirmer }));
    expect(bouton(c, "Annuler X").disabled).toBe(false);
    await act(async () => bouton(c, "Annuler X").click());
    expect(onAnnuler).toHaveBeenCalledTimes(1);
    expect(onConfirmer).not.toHaveBeenCalled();
  });

  it("focus-sur-le-titre-a-l-ouverture", async () => {
    const c = await monter(fabrique());
    const titre = c.querySelector("h2")!;
    expect(titre.textContent).toBe("Titre T");
    expect(titre.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(titre);
    const groupe = c.querySelector('[role="alertdialog"], [role="dialog"], section')!;
    expect(groupe.getAttribute("aria-labelledby")).toBe(titre.id);
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "confirmation-renforcee.css"), "utf-8");
    expect(css).toContain("var(--");
    expect(css).toMatch(/min-height:\s*var\(--cible-min\)/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla)\(/i);
    expect(css).not.toMatch(/font-weight:\s*[6-9]\d\d|font-weight:\s*bold/);
  });
});
