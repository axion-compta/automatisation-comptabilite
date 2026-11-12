// @vitest-environment jsdom
// Fiche L19-T02 : le raccourci d'un bouton est annoncé (aria-keyshortcuts) et visible dans l'infobulle.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
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
    const ids = (bouton(c).getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids).toHaveLength(1);
    const bulle = c.querySelector("#" + CSS.escape(ids[0]!))!;
    expect(bulle.getAttribute("role")).toBe("tooltip");
    expect(bulle.textContent).toBe("Raccourci fictif (g)");
  });
  it("raccourci-garde-le-aria-describedby-de-l-appelant", async () => {
    const c = await monter(<Bouton raccourci={raccourci} aria-describedby="raison-appelant">Valider</Bouton>);
    const ids = (bouton(c).getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe("raison-appelant");
    expect(infobulle(c)!.id).toBe(ids[1]);
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
    await act(async () => {
      bouton(c).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(infobulle(c)!.hidden).toBe(true);
    expect(document.activeElement).toBe(bouton(c));
    await act(async () => bouton(c).blur());
    expect(infobulle(c)!.hidden).toBe(true);
  });
  it("gestionnaires-de-l-appelant-rappeles-et-infobulle-au-survol", async () => {
    const [focus, flou, touche, entree, sortie] = [vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn()];
    const c = await monter(<Bouton raccourci={raccourci} onFocus={focus} onBlur={flou} onKeyDown={touche} onMouseEnter={entree} onMouseLeave={sortie}>Valider</Bouton>);
    const [b, evt] = [bouton(c), (type: string, init: object = {}) => act(async () => { b.dispatchEvent(new (type.startsWith("key") ? KeyboardEvent : MouseEvent)(type, { bubbles: true, ...init })); })];
    await evt("mouseover"); expect([entree.mock.calls.length, infobulle(c)!.hidden]).toEqual([1, false]);
    await evt("mouseout"); expect([sortie.mock.calls.length, infobulle(c)!.hidden]).toEqual([1, true]);
    await act(async () => b.focus()); await evt("keydown", { key: "Escape" }); await act(async () => b.blur());
    expect([focus, flou, touche].map((f) => f.mock.calls.length)).toEqual([1, 1, 1]);
  });
  it("aucun-texte-en-dur", async () => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "Bouton.tsx"), "utf8");
    expect(source).not.toMatch(/[«»]|Raccourci/);
    const c = await monter(<Bouton raccourci={{ touche: "x", libelle: "Autre libellé" }}>Valider</Bouton>);
    expect(infobulle(c)!.textContent).toBe("Autre libellé (x)");
  });
});
