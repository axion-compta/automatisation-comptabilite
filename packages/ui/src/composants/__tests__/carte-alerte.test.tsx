// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CarteAlerte, type GraviteAlerte } from "../CarteAlerte.js";

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

const MOTS: Record<GraviteAlerte, string> = { info: "Mot-info", a_faire: "Mot-afaire", urgent: "Mot-urgent", bloquant: "Mot-bloquant" };
const textes = {
  gravites: MOTS,
  echeance: "Avant le",
  reporter: "Rep",
  ignorer: "Ign",
  choixJours: "Combien de jours",
  jours: (n: number) => `${n}-j`,
  motif: "Motif-E",
  confirmer: "Conf",
  annuler: "Ann",
};
const fabrique = (gravite: GraviteAlerte, p: Record<string, unknown> = {}) => (
  <CarteAlerte
    alerte={{ id: "A1", gravite, titre: "Titre-T", echeanceLe: "2026-03-31" }}
    textes={textes}
    joursReport={[1, 3, 7]}
    motifMin={5}
    surReporter={() => {}}
    surIgnorer={() => {}}
    {...p}
  />
);
const bouton = (c: HTMLElement, t: string) => [...c.querySelectorAll("button")].find((b) => b.textContent === t) ?? null;
const champ = (c: HTMLElement) => c.querySelector("input") as HTMLInputElement;
const cliquer = (el: HTMLElement) => act(async () => el.click());
const echap = (el: Element) => act(async () => void el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
async function ecrire(el: HTMLInputElement, v: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("CarteAlerte", () => {
  it("gravite-en-mot", async () => {
    for (const g of Object.keys(MOTS) as GraviteAlerte[]) {
      const c = await monter(fabrique(g));
      expect(c.querySelector(".axion-pastille__texte")?.textContent).toBe(MOTS[g]);
      expect(c.textContent).toContain("Titre-T");
      expect(c.textContent).toContain("Avant le 31/03/2026");
    }
    const sans = await monter(fabrique("info", { alerte: { id: "A2", gravite: "info", titre: "T2" } }));
    expect(sans.textContent).not.toContain("Avant le");
  });

  it("reporter-cache-si-urgent-ou-bloquant", async () => {
    for (const [g, visible] of [["urgent", false], ["bloquant", false], ["info", true], ["a_faire", true]] as const) expect(bouton(await monter(fabrique(g)), "Rep") !== null).toBe(visible);
    expect(bouton(await monter(fabrique("info", { surReporter: undefined })), "Rep")).toBeNull();
  });

  it("ignorer-cache-si-bloquant", async () => {
    for (const g of ["bloquant", "info", "a_faire", "urgent"] as const) expect(bouton(await monter(fabrique(g)), "Ign") !== null).toBe(g !== "bloquant");
  });

  it("choix-des-jours", async () => {
    const surReporter = vi.fn();
    const c = await monter(fabrique("a_faire", { surReporter, joursReport: [2, 5] }));
    expect(c.textContent).not.toContain("Combien de jours");
    await cliquer(bouton(c, "Rep")!);
    expect(c.textContent).toContain("Combien de jours");
    expect(["2-j", "5-j"].map((t) => bouton(c, t) !== null)).toEqual([true, true]);
    expect(bouton(c, "1-j")).toBeNull();
    await cliquer(bouton(c, "5-j")!);
    expect(surReporter).toHaveBeenCalledExactlyOnceWith(5);
    expect(c.textContent).not.toContain("Combien de jours");
  });

  it("motif-trop-court-confirmation-desactivee", async () => {
    const surIgnorer = vi.fn();
    const c = await monter(fabrique("info", { surIgnorer }));
    await cliquer(bouton(c, "Ign")!);
    const label = c.querySelector("label")!;
    expect(label.textContent).toBe("Motif-E");
    expect(label.htmlFor).toBe(champ(c).id);
    expect(bouton(c, "Conf")!.disabled).toBe(true);
    for (const [v, desactive] of [["    a   ", true], ["  abcd  ", true], ["abcde", false], ["", true]] as const) {
      await ecrire(champ(c), v);
      expect(bouton(c, "Conf")!.disabled).toBe(desactive);
    }
    expect(surIgnorer).not.toHaveBeenCalled();
  });

  it("motif-valide-emet-surIgnorer", async () => {
    const surIgnorer = vi.fn();
    const c = await monter(fabrique("urgent", { surIgnorer }));
    await cliquer(bouton(c, "Ign")!);
    await ecrire(champ(c), "  motif ok  ");
    await cliquer(bouton(c, "Conf")!);
    expect(surIgnorer).toHaveBeenCalledExactlyOnceWith("motif ok");
    expect(c.querySelector("input")).toBeNull();
  });

  it("clavier-seul", async () => {
    const surIgnorer = vi.fn();
    const c = await monter(fabrique("info", { surIgnorer }));
    for (const b of c.querySelectorAll("button")) expect(b.tabIndex).toBeGreaterThanOrEqual(0);
    await cliquer(bouton(c, "Ign")!);
    expect(document.activeElement).toBe(champ(c));
    expect(champ(c).tabIndex).toBeGreaterThanOrEqual(0);
    await ecrire(champ(c), "motif ok");
    const form = c.querySelector("form")!;
    await act(async () => form.requestSubmit());
    expect(surIgnorer).toHaveBeenCalledExactlyOnceWith("motif ok");
    await cliquer(bouton(c, "Ign")!);
    await echap(champ(c));
    expect(c.querySelector("input")).toBeNull();
    await cliquer(bouton(c, "Rep")!);
    await echap(c.querySelector("section")!);
    expect(c.textContent).not.toContain("Combien de jours");
    expect(surIgnorer).toHaveBeenCalledTimes(1);
  });

  it("focus-rendu-apres-fermeture", async () => {
    const c = await monter(fabrique("info"));
    const rep = bouton(c, "Rep")!;
    const ign = bouton(c, "Ign")!;
    await cliquer(rep);
    expect(document.activeElement).toBe(bouton(c, "1-j"));
    await echap(c.querySelector("section")!);
    expect(document.activeElement).toBe(rep);
    await cliquer(ign);
    await cliquer(bouton(c, "Ann")!);
    expect(document.activeElement).toBe(ign);
    await cliquer(ign);
    await ecrire(champ(c), "motif ok");
    await cliquer(bouton(c, "Conf")!);
    expect(document.activeElement).toBe(ign);
  });
});
