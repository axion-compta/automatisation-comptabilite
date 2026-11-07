// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ChampLu } from "../ChampLu.js";
import { MotConfiance } from "../MotConfiance.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LIBELLES = { sur: "Sûr", a_verifier: "À vérifier", douteux: "Douteux" };
const conteneurs: HTMLElement[] = [];

async function monter(element: ReactNode): Promise<HTMLElement> {
  const conteneur = document.createElement("div");
  document.body.appendChild(conteneur);
  conteneurs.push(conteneur);
  await act(async () => {
    createRoot(conteneur).render(element);
  });
  return conteneur;
}

afterEach(() => {
  for (const c of conteneurs.splice(0)) c.remove();
});

describe("confiance", () => {
  it("sur-pastille-ok", async () => {
    const c = await monter(<MotConfiance mot="sur" libelles={LIBELLES} />);
    expect(c.querySelector(".axion-pastille--ok")?.textContent).toBe("Sûr");
    expect(c.querySelectorAll(".axion-pastille")).toHaveLength(1);
  });

  it("a-verifier-pastille-attente", async () => {
    const c = await monter(<MotConfiance mot="a_verifier" libelles={LIBELLES} />);
    expect(c.querySelector(".axion-pastille--attente")?.textContent).toBe("À vérifier");
    expect(c.querySelector(".axion-pastille--ok")).toBeNull();
  });

  it("douteux-pastille-bloque", async () => {
    const c = await monter(<MotConfiance mot="douteux" libelles={LIBELLES} />);
    expect(c.querySelector(".axion-pastille--bloque")?.textContent).toBe("Douteux");
    expect(c.querySelector(".axion-pastille--attente")).toBeNull();
  });

  it("champ-sur-sans-evidence", async () => {
    const c = await monter(
      <dl>
        <ChampLu libelle="Numéro" valeur="F-0101" mot="sur" libelles={LIBELLES} explication="Texte" />
      </dl>,
    );
    const dd = c.querySelector("dd");
    expect(c.querySelector("dt")?.textContent).toBe("Numéro");
    expect(dd?.textContent).toContain("F-0101");
    expect(dd?.className).not.toContain("evidence");
    expect(dd?.hasAttribute("aria-describedby")).toBe(false);
    expect(c.querySelector(".axion-champ-lu__explication")).toBeNull();
  });

  it("champ-douteux-en-evidence-et-decrit", async () => {
    const c = await monter(
      <dl>
        <ChampLu libelle="Total" valeur="119" mot="douteux" libelles={LIBELLES} explication="Chiffre peu lisible" />
        <ChampLu libelle="Date" valeur="demain" mot="a_verifier" libelles={LIBELLES} />
      </dl>,
    );
    const [dd1, dd2] = Array.from(c.querySelectorAll("dd"));
    expect(dd1?.className).toContain("axion-champ-lu__valeur--evidence");
    expect(dd1?.className).toContain("axion-champ-lu__valeur--douteux");
    const id = dd1?.getAttribute("aria-describedby") ?? "";
    expect(id).not.toBe("");
    expect(document.getElementById(id)?.textContent).toBe("Chiffre peu lisible");
    expect(dd1?.querySelector(".axion-pastille--bloque")).not.toBeNull();
    // Sans explication : en évidence, mais aucune référence pendante.
    expect(dd2?.className).toContain("axion-champ-lu__valeur--evidence");
    expect(dd2?.hasAttribute("aria-describedby")).toBe(false);
  });

  it("aucun-chiffre-rendu", async () => {
    for (const mot of ["sur", "a_verifier", "douteux"] as const) {
      const c = await monter(<MotConfiance mot={mot} libelles={LIBELLES} />);
      expect(c.textContent).not.toMatch(/[0-9%]/);
      expect(c.innerHTML).not.toMatch(/>[^<]*[0-9%][^<]*</);
    }
  });

  it("mot-inconnu-refuse-par-le-type", () => {
    // @ts-expect-error un mot hors de l'échelle est refusé à la compilation
    const element = <MotConfiance mot="probable" libelles={LIBELLES} />;
    expect(element).toBeDefined();
  });
});
