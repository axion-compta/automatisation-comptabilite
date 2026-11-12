// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { agents } from "../../../../textes/src/ecrans/agents.js";
import { IconeAgent, SPECIALITES } from "../IconeAgent.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const LIB = { ...agents.specialites, neutre: agents.neutre };
const conteneurs: HTMLElement[] = [];
afterEach(() => conteneurs.splice(0).forEach((c) => c.remove()));
async function monter(e: ReactNode): Promise<HTMLElement> {
  const c = document.createElement("div");
  document.body.appendChild(c);
  conteneurs.push(c);
  await act(async () => {
    createRoot(c).render(e);
  });
  return c;
}
const forme = (c: HTMLElement) => c.querySelector("path")?.getAttribute("d");

describe("IconeAgent", () => {
  it("liste-fermee", async () => {
    expect([...SPECIALITES]).toEqual(["lecture", "banque", "tva", "controle", "chat"]);
    const formes = new Set<string | null | undefined>();
    for (const s of SPECIALITES) {
      const c = await monter(<IconeAgent specialite={s} libelles={LIB} />);
      expect(c.querySelector("[role=img]")?.getAttribute("aria-label")).toBe(LIB[s]);
      formes.add(forme(c));
    }
    expect(formes.size).toBe(5);
  });

  it("specialite-inconnue-neutre", async () => {
    const neutre = await monter(<IconeAgent specialite={undefined} libelles={LIB} />);
    for (const s of ["inconnue", "", "Lecture", "constructor", "__proto__"]) {
      const c = await monter(<IconeAgent specialite={s} libelles={LIB} />);
      expect(c.querySelector("[role=img]")?.getAttribute("aria-label")).toBe(LIB.neutre);
      expect(forme(c)).toBe(forme(neutre));
    }
    for (const s of SPECIALITES) expect(forme(await monter(<IconeAgent specialite={s} libelles={LIB} />))).not.toBe(forme(neutre));
  });

  it("libelle-accessible", async () => {
    const c = await monter(<IconeAgent specialite="tva" libelles={LIB} />);
    const img = c.querySelector("[role=img]")!;
    expect(img.getAttribute("aria-label")).toBe("Spécialité : TVA");
    expect(img.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("aucun-prenom-ni-visage", async () => {
    // Un libellé = « Spécialité : » + un nom de fonction en minuscules (sauf sigle) ; pas de majuscule de prénom.
    for (const l of [...Object.values(agents.specialites), agents.neutre]) {
      expect(l).toMatch(/^Spécialité : (TVA|[a-zéèêô]+( [a-zéèêô]+)*)$/);
    }
    for (const s of [...SPECIALITES, "x"]) {
      const c = await monter(<IconeAgent specialite={s} libelles={LIB} />);
      expect(c.querySelector("circle, ellipse, image, img")).toBeNull();
    }
  });
});
