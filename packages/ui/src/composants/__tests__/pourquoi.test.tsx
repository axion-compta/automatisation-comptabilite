// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppelIa, DecisionIa } from "../../../../contrat/src/chat/journal-ia.js";
import { Pourquoi, type PourquoiLibelles } from "../Pourquoi.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LIB: PourquoiLibelles = {
  bouton: "Pourquoi ?", demandeur: "Demandé par", systeme: "Le système", date: "Date", source: "Origine",
  motif: "Motif", confiance: "Confiance", sourcesLegales: "Sources", modele: "Modèle", nonDisponible: "non disponible",
  sources: { regle_societe: "Règle", historique: "Historique", ia_exemples: "Exemples", ia_seule: "IA seule" },
  mots: { sur: "Sûr", a_verifier: "À vérifier", douteux: "Douteux" },
};
const decision: DecisionIa = {
  id: "d1", quand: "2030-01-15T10:00:00Z", agent: "classeur", etape: "classee",
  demandeur: { sorte: "personne", id: "u1" }, conversation_id: "c1", objet: { type: "piece", id: "p1" },
  proposition: "compte_x", source_proposition: "historique", confiance: "a_verifier", motif: "Fournisseur déjà classé",
  sources_legales: ["DEC-1:art@2030", "DEC-2:reg@2030"], appel_id: "a1", cout_micro_centimes: 1,
};
const appel: AppelIa = {
  id: "a1", agent: "classeur", piece_id: "p1", alias: "rapide", modele: "modele-x", version_modele: "v1",
  fournisseur: "four-a", region: "eu-1", jetons_entree: 1, jetons_sortie: 1, cout_micro_centimes: 1, duree_ms: 1, issue: "ok",
};
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
async function ouvert(d: unknown = decision, a: AppelIa | null = appel, onSource = () => {}): Promise<HTMLElement> {
  const c = await monter(<Pourquoi decision={d as DecisionIa} appel={a ?? undefined} libelles={LIB} onSource={onSource} />);
  await act(async () => c.querySelector("button")!.click());
  return c;
}
const valeurs = (c: HTMLElement) => Object.fromEntries([...c.querySelectorAll("dt")].map((t) => [t.textContent, t.nextElementSibling?.textContent]));

afterEach(() => {
  for (const c of conteneurs.splice(0)) c.remove();
});

describe("pourquoi", () => {
  it("rubriques-presentes", async () => {
    const v = valeurs(await ouvert());
    expect(Object.keys(v)).toEqual(["Demandé par", "Date", "Origine", "Motif", "Confiance", "Sources", "Modèle"]);
    expect(v["Demandé par"]).toBe("u1");
    expect(v["Date"]).toBe("15/01/2030");
    expect(v["Origine"]).toBe("Historique");
    expect(v["Motif"]).toBe("Fournisseur déjà classé");
    expect(v["Modèle"]).toBe("rapide (v1)");
  });

  it("confiance-en-mot", async () => {
    for (const [mot, texte] of [["sur", "Sûr"], ["a_verifier", "À vérifier"], ["douteux", "Douteux"]] as const) {
      const c = await ouvert({ ...decision, confiance: mot });
      expect(valeurs(c)["Confiance"]).toBe(texte);
    }
  });

  it("aucun-pourcentage", async () => {
    const c = await ouvert();
    expect(c.textContent).not.toContain("%");
    expect(c.innerHTML).not.toContain("%");
  });

  it("sources-cliquables", async () => {
    const onSource = vi.fn();
    const c = await ouvert(decision, appel, onSource);
    const boutons = [...c.querySelectorAll<HTMLButtonElement>(".axion-pourquoi__source")];
    expect(boutons.map((b) => b.textContent)).toEqual(["DEC-1:art@2030", "DEC-2:reg@2030"]);
    await act(async () => boutons[1]!.click());
    expect(onSource).toHaveBeenCalledExactlyOnceWith("DEC-2:reg@2030");
  });

  it("appel-absent", async () => {
    const c = await ouvert(decision, null);
    expect(valeurs(c)["Modèle"]).toBe("non disponible");
    expect(valeurs(c)["Motif"]).toBe("Fournisseur déjà classé");
  });

  it("demandeur-systeme", async () => {
    const c = await ouvert({ ...decision, demandeur: { sorte: "systeme" } });
    expect(valeurs(c)["Demandé par"]).toBe("Le système");
  });

  it("ouverture-au-clavier", async () => {
    const c = await monter(<Pourquoi decision={decision} appel={appel} libelles={LIB} onSource={() => {}} />);
    const bouton = c.querySelector("button")!;
    expect(bouton.tagName).toBe("BUTTON");
    expect(bouton.tabIndex).toBeGreaterThanOrEqual(0);
    expect(bouton.getAttribute("aria-expanded")).toBe("false");
    expect(c.querySelector("dl")).toBeNull();
    await act(async () => bouton.click());
    expect(bouton.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById(bouton.getAttribute("aria-controls")!)).not.toBeNull();
    await act(async () => {
      bouton.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(bouton.getAttribute("aria-expanded")).toBe("false");
    expect(c.querySelector("dl")).toBeNull();
  });

  it("aucun-champ-texte-brut-affiche", async () => {
    const secret = "CONTENU-LU-PAR-IA";
    const c = await ouvert({ ...decision, texte: secret, contenu: secret });
    expect(c.textContent).not.toContain(secret);
    expect(Object.keys(valeurs(c))).toHaveLength(7);
  });

  it("date-invalide", async () => {
    for (const quand of ["pas-une-date", "", "2030-13-45T00:00:00Z", undefined, Number.NaN]) {
      const c = await ouvert({ ...decision, quand });
      expect(valeurs(c)["Date"]).toBe("non disponible");
      expect(c.textContent).not.toContain("Invalid");
    }
  });
});
