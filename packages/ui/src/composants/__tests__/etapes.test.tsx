// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { Etapes, type EtapesProps } from "../Etapes.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const etats = { en_cours: "en cours", faite: "faite", echec: "échec" };

async function monter(props: Partial<EtapesProps>): Promise<HTMLElement> {
  const el = document.createElement("div");
  document.body.appendChild(el);
  await act(async () => { createRoot(el).render(<Etapes titre="Étapes" etapes={[]} libellesEtats={etats} {...props} />); });
  return el;
}

describe("etapes", () => {
  it("etapes-dans-l-ordre", async () => {
    const el = await monter({ etapes: [{ libelle: "B", etat: "faite" }, { libelle: "A", etat: "en_cours" }, { libelle: "C", etat: "faite" }] });
    expect(el.querySelector("ol")).not.toBeNull();
    expect([...el.querySelectorAll("li")].map((li) => li.textContent?.match(/[ABC]/)?.[0])).toEqual(["B", "A", "C"]);
    expect(el.querySelector("section")?.getAttribute("aria-live")).toBe("polite");
  });

  it("etat-annonce-sans-couleur-seule", async () => {
    const el = await monter({ etapes: [{ libelle: "A", etat: "en_cours" }, { libelle: "B", etat: "faite" }, { libelle: "C", etat: "echec" }] });
    const lis = [...el.querySelectorAll("li")];
    expect(lis.map((li) => li.getAttribute("data-etat"))).toEqual(["en_cours", "faite", "echec"]);
    expect(lis.map((li) => li.textContent)).toEqual([expect.stringContaining("(en cours)"), expect.stringContaining("(faite)"), expect.stringContaining("(échec)")]);
    expect(new Set(lis.map((li) => li.querySelector("[aria-hidden]")?.textContent)).size).toBe(3);
  });

  it("liste-vide", async () => {
    const el = await monter({});
    expect(el.querySelectorAll("li")).toHaveLength(0);
    expect(el.querySelector("h3")?.textContent).toBe("Étapes");
  });
});
