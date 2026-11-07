// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TroisMontantsTva } from "../TroisMontantsTva.js";

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

const libelles = { titre: "Titre T", deduits: "Libellé D", enAttente: "Libellé E", perdus: "Libellé P" };
const fabrique = (deduits: number, enAttente: number, perdus: number) => (
  <TroisMontantsTva deduits={deduits} enAttente={enAttente} perdus={perdus} libelles={libelles} />
);
const NBSP = " ";

describe("TroisMontantsTva", () => {
  it("trois-toujours-affiches", async () => {
    const c = await monter(fabrique(0, 0, 0));
    const dd = [...c.querySelectorAll("dd")].map((d) => d.textContent);
    expect(dd).toEqual([`0,00${NBSP}€`, `0,00${NBSP}€`, `0,00${NBSP}€`]);
    expect(c.querySelectorAll("dt").length).toBe(3);
  });

  it("montants-formates", async () => {
    const c = await monter(fabrique(180000, 4000, 1200));
    expect([...c.querySelectorAll("dd")].map((d) => d.textContent)).toEqual([
      `1\u202f800,00${NBSP}€`,
      `40,00${NBSP}€`,
      `12,00${NBSP}€`,
    ]);
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const [a, b, p] of [[Number.NaN, 0, 0], [0, Number.POSITIVE_INFINITY, 0], [0, 0, 1.5]] as const) {
      await expect(monter(fabrique(a, b, p))).rejects.toThrow();
    }
    erreur.mockRestore();
  });

  it("ordre-fixe", async () => {
    const c = await monter(fabrique(300, 100, 200));
    expect([...c.querySelectorAll("dt")].map((t) => t.textContent)).toEqual(["Libellé D", "Libellé E", "Libellé P"]);
    expect([...c.querySelectorAll("dd")].map((d) => d.textContent)).toEqual([`3,00${NBSP}€`, `1,00${NBSP}€`, `2,00${NBSP}€`]);
    const inverse = await monter(fabrique(200, 100, 300));
    expect([...inverse.querySelectorAll("dd")].map((d) => d.textContent)).toEqual([`2,00${NBSP}€`, `1,00${NBSP}€`, `3,00${NBSP}€`]);
  });

  it("structure-dl-accessible", async () => {
    const c = await monter(fabrique(1, 2, 3));
    const dl = c.querySelector("dl")!;
    expect(dl.children.length).toBe(6);
    expect([...dl.children].map((e) => e.tagName)).toEqual(["DT", "DD", "DT", "DD", "DT", "DD"]);
    const section = c.querySelector("section")!;
    const titre = section.querySelector("h2")!;
    expect(titre.textContent).toBe("Titre T");
    expect(section.getAttribute("aria-labelledby")).toBe(titre.id);
    expect(titre.id).not.toBe("");
    expect(c.querySelector('[role="alert"]')).toBeNull();
  });

  it("aucun-texte-en-dur", async () => {
    const c = await monter(fabrique(180000, 4000, 1200));
    const noeuds: string[] = [];
    const parcours = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (parcours.nextNode()) noeuds.push((parcours.currentNode.textContent ?? "").trim());
    expect(noeuds.filter((t) => t !== "")).toEqual([
      "Titre T",
      "Libellé D",
      `1\u202f800,00${NBSP}€`,
      "Libellé E",
      `40,00${NBSP}€`,
      "Libellé P",
      `12,00${NBSP}€`,
    ]);
  });
});
