import { describe, expect, it } from "vitest";
import { genererBanque } from "../banque.js";
import { genererVuesBanque } from "../banque-vues.js";

const jeu = genererBanque();
const v = genererVuesBanque();
const somme = (n: number[]): number => n.reduce((s, x) => s + x, 0);

describe("vues banque", () => {
  it("septembre-manquant-dans-la-couverture", () => {
    const bq1 = v.couverture.find((c) => c.compteId === "BQ1")!;
    expect(
      bq1.mois.filter((m) => m.etat === "manquant").map((m) => m.mois),
    ).toEqual(["2026-09"]);
    expect(bq1.mois.filter((m) => m.etat === "couvert")).toHaveLength(9);
  });

  it("trou-de-septembre-ecart", () => {
    expect(v.trous).toHaveLength(1);
    expect(v.trous[0]).toMatchObject({
      compteId: "BQ1",
      debut: "2026-09-01",
      fin: "2026-09-30",
      ecart: 134567,
      etat: "ouvert",
    });
  });

  it("demandes-sur-les-lignes-du-jeu", () => {
    const attendues = Object.entries(jeu.attendus)
      .filter(([, a]) => "etat" in a && a.etat === "SANS_PIECE")
      .map(([id]) => id);
    const ids = v.demandes.flatMap((d) => d.ligneIds);
    expect(attendues).toHaveLength(12);
    expect([...ids].sort()).toEqual([...attendues].sort());
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of v.demandes) {
      expect(d.reponsesPretes.length).toBeGreaterThan(0);
      for (const id of d.ligneIds)
        expect(jeu.lignes.some((l) => l.id === id)).toBe(true);
    }
  });

  it("impact-egal-a-la-somme", () => {
    for (const d of v.demandes) {
      const montants = d.ligneIds.map((id) =>
        Math.abs(jeu.lignes.find((l) => l.id === id)!.montant),
      );
      expect(d.nombre).toBe(d.ligneIds.length);
      expect(d.impact).toBe(somme(montants));
    }
  });

  it("un-doublon-propose", () => {
    expect(v.doublons).toHaveLength(1);
    const d = v.doublons[0]!;
    expect(d.etat).toBe("propose");
    const [a, b] = [d.ligneA, d.ligneB].map(
      (id) => jeu.lignes.find((l) => l.id === id)!,
    );
    expect(a.id).not.toBe(b.id);
    expect([a.montant, a.dateOperation]).toEqual([b.montant, b.dateOperation]);
  });

  it("flux-t11-1", () => {
    expect(v.soldesDepart).toEqual([
      { compteId: "BQ1", solde: 1840000, date: "2026-11-04" },
    ]);
    const dans30 = v.flux.filter(
      (f) => f.date > "2026-11-04" && f.date <= "2026-12-04",
    );
    expect(v.flux).toHaveLength(4);
    expect(dans30).toHaveLength(4);
    expect(v.soldesDepart[0]!.solde + somme(dans30.map((f) => f.montant))).toBe(
      1640000,
    );
    expect(v.flux.find((f) => f.origine === "tva")).toMatchObject({
      date: "2026-11-23",
      montant: -230000,
      certitude: "estime",
    });
    expect(v.flux.find((f) => f.origine === "loyer")).toMatchObject({
      date: "2026-11-05",
      montant: -150000,
    });
  });

  it("dettes-t13-1", () => {
    expect(v.dettes.map((d) => d.reste)).toEqual([120000, 83040, 200000]);
    expect(v.dettes.filter((d) => d.ibanChange).map((d) => d.reste)).toEqual([
      83040,
    ]);
    for (const d of v.dettes) {
      expect(d.ibanMasque).toMatch(/^FR76 •••• [0-9]{4}$/);
      expect(d.fournisseurNom).toBe(
        jeu.contreparties.find((c) => c.id === d.fournisseurId)!.nom,
      );
    }
  });

  it("graine-fixe-memes-vues", () => {
    expect(JSON.stringify(genererVuesBanque(genererBanque()))).toBe(
      JSON.stringify(v),
    );
    expect(JSON.stringify(genererVuesBanque(genererBanque(1)))).toBe(
      JSON.stringify(genererVuesBanque(genererBanque(1))),
    );
    const vide = genererVuesBanque({
      ...jeu,
      comptes: [],
      releves: [],
      lignes: [],
      pieces: [],
      attendus: {},
      contreparties: [],
      explications: [],
    });
    expect(vide).toEqual({
      couverture: [],
      trous: [],
      demandes: [],
      doublons: [],
      flux: [],
      soldesDepart: [],
      dettes: [],
    });
  });
});
