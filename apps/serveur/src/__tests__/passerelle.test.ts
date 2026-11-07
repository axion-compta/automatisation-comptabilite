import { describe, expect, it, vi } from "vitest";
import { validerListeRoutes } from "../../../../packages/noyau/src/securite/routes-ia.js";
import {
  creerPasserelle,
  type AppelFournisseur,
  type Evenement,
} from "../ia/passerelle.js";

const liste = validerListeRoutes({
  routes: [
    {
      fournisseur: "fournisseur-test",
      region: "region-test",
      mode: "sans-entrainement",
      decision: "D43",
      ajouteeLe: "2026-11-07",
    },
  ],
});
const route = {
  fournisseur: "fournisseur-test",
  region: "region-test",
  mode: "sans-entrainement",
};

function monter(appel: AppelFournisseur) {
  const evenements: Evenement[] = [];
  const passerelle = creerPasserelle({
    liste,
    appel,
    journaliser: (e) => evenements.push(e),
  });
  return { passerelle, evenements };
}

describe("passerelle", () => {
  it("route-hors-liste-refusee-journalisee", async () => {
    const appel = vi.fn(async () => "x");
    const { passerelle, evenements } = monter(appel);
    for (const mauvaise of [
      { ...route, region: "region-autre" },
      { ...route, fournisseur: "" },
      { ...route, mode: "avec-entrainement" },
    ]) {
      const r = await passerelle.demander({
        client: "client-a",
        route: mauvaise,
        question: "texte fictif secret",
      });
      expect(r).toEqual({ issue: "refusee" });
    }
    expect(appel).not.toHaveBeenCalled();
    expect(evenements).toHaveLength(3);
    expect(evenements.every((e) => e.type === "ia.route_refusee")).toBe(true);
    expect(JSON.stringify(evenements)).not.toContain("secret");
    expect(
      evenements.every((e) => "client" in e && e.client === "client-a"),
    ).toBe(true);
  });

  it("client-vide-refuse-sans-appel-ni-cache", async () => {
    const appel = vi.fn(async () => "x");
    const { passerelle, evenements } = monter(appel);
    for (const client of ["", "  ", ""]) {
      const r = await passerelle.demander({ client, route, question: "q" });
      expect(r).toEqual({ issue: "refusee" });
    }
    expect(appel).not.toHaveBeenCalled();
    expect(evenements).toHaveLength(3);
  });

  it("meme-question-deux-clients-aucun-cache-commun", async () => {
    const vus: string[] = [];
    const { passerelle } = monter(async (_r, client) => {
      vus.push(client);
      return "réponse pour " + client;
    });
    const q = (client: string) =>
      passerelle.demander({ client, route, question: "même question" });
    const a1 = await q("client-a");
    const b = await q("client-b");
    const a2 = await q("client-a");
    expect(a1).toEqual({ issue: "ok", texte: "réponse pour client-a" });
    expect(b).toEqual({ issue: "ok", texte: "réponse pour client-b" });
    expect(a2).toEqual(a1);
    expect(vus).toEqual(["client-a", "client-b"]);
  });

  it("cle-de-cache-sans-collision-entre-clients", async () => {
    const { passerelle } = monter(async (_r, client) => client);
    await passerelle.demander({ client: "a", route, question: "b:q" });
    const r = await passerelle.demander({
      client: "a:b",
      route,
      question: "q",
    });
    expect(r).toEqual({ issue: "ok", texte: "a:b" });
  });

  it("panne-fournisseur-vingt-pieces-en-attente", async () => {
    const ecrites: string[] = [];
    const { passerelle, evenements } = monter(async () => {
      throw new Error("panne");
    });
    const pieces = Array.from({ length: 20 }, (_, i) => "piece-" + String(i));
    const bilan = await passerelle.traiterPieces({
      client: "client-a",
      route,
      pieces,
      question: (p) => "contenu de " + p,
      ecrire: (p) => ecrites.push(p),
    });
    expect(bilan.enAttente).toEqual(pieces);
    expect(bilan.traitees).toEqual([]);
    expect(ecrites).toEqual([]);
    expect(evenements.some((e) => e.type === "ia.indisponible")).toBe(true);
    expect(JSON.stringify(evenements)).not.toContain("contenu de");
  });

  it("panne-au-milieu-aucune-ecriture-partielle", async () => {
    let n = 0;
    const ecrites: string[] = [];
    const { passerelle } = monter(async () => {
      n += 1;
      if (n === 2) throw new Error("panne");
      return "ok";
    });
    const bilan = await passerelle.traiterPieces({
      client: "client-a",
      route,
      pieces: ["p1", "p2", "p3"],
      question: (p) => p,
      ecrire: (p) => ecrites.push(p),
    });
    expect(bilan.traitees).toEqual(["p1"]);
    expect(bilan.enAttente).toEqual(["p2", "p3"]);
    expect(ecrites).toEqual(["p1"]);
  });
});
