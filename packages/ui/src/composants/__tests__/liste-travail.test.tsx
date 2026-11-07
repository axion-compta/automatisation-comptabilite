// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ListeTravail, type ListeTravailProps, type MentionListeTravail } from "../ListeTravail.js";

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

const MENTION: MentionListeTravail = "document de travail, ne remplace pas le registre légal";
interface Ligne {
  id: string;
  nom: string;
}
const colonnes = [{ cle: "nom", entete: "Nom", rendu: (l: Ligne) => l.nom }];
const lignes = (n: number): Ligne[] => Array.from({ length: n }, (_, i) => ({ id: `l${i}`, nom: `Personne ${i}` }));
function liste(surcharge: Partial<ListeTravailProps<Ligne>> = {}) {
  return (
    <ListeTravail<Ligne>
      mention={MENTION}
      titre="Liste exemple"
      type="associes"
      colonnes={colonnes}
      lignes={lignes(2)}
      cleDeLigne={(l) => l.id}
      texteVide="Rien à afficher"
      {...surcharge}
    />
  );
}

describe("ListeTravail", () => {
  it("mention-toujours-rendue", async () => {
    for (const titre of ["Liste exemple", ""]) {
      const c = await monter(liste({ titre }));
      expect(c.textContent).toContain(MENTION);
    }
  });
  it("mention-avant-le-tableau", async () => {
    const c = await monter(liste());
    const mention = c.querySelector(".axion-liste-travail__mention")!;
    const tableau = c.querySelector("table")!;
    expect(mention.compareDocumentPosition(tableau) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("mention-decrit-le-tableau", async () => {
    const c = await monter(liste());
    const groupe = c.querySelector("[aria-describedby]")!;
    const cible = c.querySelector(`#${groupe.getAttribute("aria-describedby")}`)!;
    expect(cible.textContent).toBe(MENTION);
    expect(groupe.contains(c.querySelector("table"))).toBe(true);
  });
  it("liste-vide-mention-gardee", async () => {
    const c = await monter(liste({ lignes: [] }));
    expect(c.textContent).toContain(MENTION);
    expect(c.textContent).toContain("Rien à afficher");
    expect(c.querySelector("table")).toBeNull();
  });
  it("autre-mention-ne-compile-pas", () => {
    // @ts-expect-error une autre chaîne est refusée par le type
    const autre: MentionListeTravail = "registre officiel";
    expect(autre).toBeTypeOf("string");
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "ListeTravail.tsx"), "utf8");
    expect(source).toContain(`type MentionListeTravail = "${MENTION}"`);
  });
  it("trois-types-de-liste", async () => {
    for (const type of ["associes", "decisions", "mouvements_titres"] as const) {
      const c = await monter(liste({ type }));
      expect(c.querySelector(`[data-type="${type}"]`)).not.toBeNull();
      expect(c.textContent).toContain(MENTION);
    }
  });
  it("cas-limites-mille-lignes", async () => {
    const c = await monter(liste({ lignes: lignes(1000) }));
    expect(c.querySelectorAll("tbody tr")).toHaveLength(1000);
    expect(c.textContent).toContain(MENTION);
  });
});
