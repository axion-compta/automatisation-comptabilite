// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { TexteSources, type Segment } from "../TexteSources.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const libelles = { inconnu: "je ne sais pas", voirSource: "voir la source", lexique: "voir le lexique" };
const source = { type: "facture", id: "f1" };
const valeur = (nature: "montant" | "date" | "nombre", v: string | number): Segment => ({ sorte: "valeur", valeur: v, nature, source });

async function monter(segments: Segment[], onSource = vi.fn()): Promise<HTMLElement> {
  const el = document.createElement("div");
  document.body.appendChild(el);
  await act(async () => { createRoot(el).render(<TexteSources segments={segments} libelles={libelles} onSource={onSource} />); });
  return el;
}

describe("texte-sources", () => {
  it("segment-texte", async () => {
    expect((await monter([{ sorte: "texte", texte: "Bonjour " }, { sorte: "texte", texte: "Alice" }])).textContent).toBe("Bonjour Alice");
  });

  it("montant-formate-et-cliquable", async () => {
    const onSource = vi.fn();
    const el = await monter([valeur("montant", 48250)], onSource);
    const b = el.querySelector("button");
    expect(b?.textContent).toBe("482,50\u00a0€");
    await act(async () => { b?.click(); });
    expect(onSource).toHaveBeenCalledWith(source);
  });

  it("date-formatee", async () => {
    expect((await monter([valeur("date", "2026-03-31")])).querySelector("button")?.textContent).toBe("31/03/2026");
  });

  it("inconnu-je-ne-sais-pas", async () => {
    const el = await monter([{ sorte: "inconnu" }]);
    expect(el.textContent).toBe("je ne sais pas");
    expect(el.querySelector("button")).toBeNull();
  });

  it("marqueur-voir-source", async () => {
    const el = await monter([{ sorte: "texte", texte: "Total ⟦voir_source⟧ et ⟦lexique⟧." }]);
    expect(el.textContent).toBe("Total voir la source et voir le lexique.");
  });

  it("valeur-invalide", async () => {
    const invalides = [valeur("montant", Number.NaN), valeur("montant", Number.POSITIVE_INFINITY), valeur("montant", 12.5), valeur("date", "31/03/2026"), valeur("nombre", Number.NaN)];
    for (const s of invalides) {
      const el = await monter([s]);
      expect(el.textContent).toBe("je ne sais pas");
      expect(el.textContent).not.toContain("NaN");
      expect(el.querySelector("button")).toBeNull();
    }
  });

  it("aucun-html-interprete", async () => {
    const el = await monter([{ sorte: "texte", texte: "<b>x</b>" }]);
    expect(el.textContent).toBe("<b>x</b>");
    expect(el.querySelector("b")).toBeNull();
  });
});
