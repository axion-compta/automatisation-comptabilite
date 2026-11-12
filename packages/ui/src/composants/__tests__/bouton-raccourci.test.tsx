// @vitest-environment jsdom
// Fiche L19-T02 : le raccourci d'un bouton est annoncé (aria-keyshortcuts) et visible dans l'infobulle.
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { Bouton } from "../Bouton.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const raccourci = { touche: "g", libelle: "Raccourci fictif" };

async function monter(element: ReactNode): Promise<HTMLElement> {
  const conteneur = document.createElement("div");
  document.body.appendChild(conteneur);
  await act(async () => {
    createRoot(conteneur).render(element);
  });
  return conteneur;
}
const bouton = (c: HTMLElement): HTMLButtonElement => c.querySelector("button")!;
const infobulle = (c: HTMLElement): HTMLElement | null => c.querySelector('[role="tooltip"]');

describe("Bouton avec raccourci", () => {
  it("raccourci-dans-aria-keyshortcuts", async () => {
    const c = await monter(<Bouton raccourci={raccourci}>Valider</Bouton>);
    expect(bouton(c).getAttribute("aria-keyshortcuts")).toBe("g");
  });

  it("raccourci-visible-dans-l-infobulle", async () => {
    const c = await monter(<Bouton raccourci={raccourci}>Valider</Bouton>);
    const id = bouton(c).getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    const bulle = c.querySelector("#" + CSS.escape(id!))!;
    expect(bulle.getAttribute("role")).toBe("tooltip");
    expect(bulle.textContent).toBe("Raccourci fictif (g)");
  });

  it("sans-raccourci-rendu-inchange", async () => {
    const c = await monter(<Bouton>Valider</Bouton>);
    expect(c.innerHTML).toBe('<button type="button" class="axion-bouton axion-bouton--principal">Valider</button>');
    expect(infobulle(c)).toBeNull();
  });

  it("infobulle-au-focus-clavier", async () => {
    const c = await monter(<Bouton raccourci={raccourci}>Valider</Bouton>);
    expect(infobulle(c)!.hidden).toBe(true);
    await act(async () => bouton(c).focus());
    expect(infobulle(c)!.hidden).toBe(false);
    await act(async () => bouton(c).blur());
    expect(infobulle(c)!.hidden).toBe(true);
  });

  it("aucun-texte-en-dur", async () => {
    const source = readFileSync("packages/ui/src/composants/Bouton.tsx", "utf8");
    expect(source).not.toMatch(/[«»]|Raccourci/);
    const c = await monter(<Bouton raccourci={{ touche: "x", libelle: "Autre libellé" }}>Valider</Bouton>);
    expect(infobulle(c)!.textContent).toBe("Autre libellé (x)");
  });
});
