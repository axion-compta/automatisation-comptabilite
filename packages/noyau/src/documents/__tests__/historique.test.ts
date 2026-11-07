import { describe, expect, it } from "vitest";
import {
  ajouterVersion,
  dernierEnVigueur,
  ErreurHistorique,
  valider,
  type DocumentProduit,
  type NouveauDocument,
} from "../historique.js";

const HASH = "a".repeat(64);

function nouveau(surcharge: Partial<NouveauDocument> = {}): NouveauDocument {
  return {
    id: "doc-x",
    type: "fec",
    exerciceId: "ex-1",
    statut: "a_valider",
    sha256: HASH,
    versionLogiciel: "0.0.0-test",
    versionPaquet: "p-test",
    preparePar: "Camille Fictif",
    prepareLe: "2026-01-02T10:00:00Z",
    resultatControles: "ok",
    ...surcharge,
  };
}

function doc(surcharge: Partial<DocumentProduit> = {}): DocumentProduit {
  return { ...nouveau(), version: 1, ...surcharge };
}

function gele(h: DocumentProduit[]): readonly DocumentProduit[] {
  h.forEach((d) => Object.freeze(d));
  return Object.freeze(h);
}

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(ErreurHistorique);
    return (e as ErreurHistorique).code;
  }
  return undefined;
}

describe("historique", () => {
  it("premiere-version-1", () => {
    const h = ajouterVersion([], nouveau());
    expect(h).toHaveLength(1);
    expect(h[0]?.version).toBe(1);
    expect(h[0]?.statut).toBe("a_valider");
  });

  it("version-suivante-par-couple", () => {
    let h = ajouterVersion([], nouveau({ id: "a" }));
    h = ajouterVersion(h, nouveau({ id: "b", exerciceId: "ex-2" }));
    h = ajouterVersion(h, nouveau({ id: "c", type: "pv" }));
    h = ajouterVersion(h, nouveau({ id: "d" }));
    expect(h.map((d) => [d.id, d.version])).toEqual([
      ["a", 1],
      ["b", 1],
      ["c", 1],
      ["d", 2],
    ]);
    // La plus grande version sert de base, pas le nombre de documents.
    const trou = ajouterVersion(
      [doc({ id: "z", version: 5 })],
      nouveau({ id: "n" }),
    );
    expect(trou[1]?.version).toBe(6);
  });

  it("remplacement-avec-motif", () => {
    const h0 = [
      doc({
        id: "v1",
        statut: "valide",
        validePar: "Camille Fictif",
        valideLe: "2026-02-01",
      }),
    ];
    const h1 = ajouterVersion(
      h0,
      nouveau({ id: "v2", motif: "Correction après réouverture" }),
    );
    expect(h1.find((d) => d.id === "v1")?.statut).toBe("remplace");
    expect(h1.find((d) => d.id === "v2")?.version).toBe(2);
    expect(h1.find((d) => d.id === "v2")?.statut).toBe("a_valider");
    // Un autre couple n'est pas touché.
    const autre = [
      doc({ id: "o", exerciceId: "ex-9", statut: "valide" }),
      doc({ id: "p", statut: "brouillon" }),
    ];
    const h2 = ajouterVersion(autre, nouveau({ id: "q" }));
    expect(h2.find((d) => d.id === "o")?.statut).toBe("valide");
    expect(h2.find((d) => d.id === "p")?.statut).toBe("brouillon");
  });

  it("remplacement-sans-motif-refuse", () => {
    const h = [doc({ statut: "valide" })];
    expect(code(() => ajouterVersion(h, nouveau()))).toBe("motif_obligatoire");
    expect(code(() => ajouterVersion(h, nouveau({ motif: "   " })))).toBe(
      "motif_obligatoire",
    );
    expect(code(() => ajouterVersion(h, nouveau({ motif: "" })))).toBe(
      "motif_obligatoire",
    );
    // Sans version validée, aucun motif n'est exigé.
    expect(
      code(() => ajouterVersion([doc({ statut: "brouillon" })], nouveau())),
    ).toBeUndefined();
  });

  it("liste-recue-intacte", () => {
    const h = gele([doc({ id: "v1", statut: "valide" })]);
    const r = ajouterVersion(h, nouveau({ id: "v2", motif: "Réouverture" }));
    expect(r).not.toBe(h);
    expect(h).toHaveLength(1);
    expect(h[0]?.statut).toBe("valide");
    const v = valider(gele([doc({ id: "b", statut: "a_valider" })]), "b", {
      par: "Camille Fictif",
      le: "2026-03-01",
    });
    expect(v[0]?.statut).toBe("valide");
    expect(v[0]?.validePar).toBe("Camille Fictif");
    expect(v[0]?.valideLe).toBe("2026-03-01");
  });

  it("indicatif-non-validable", () => {
    const h = [doc({ id: "i", statut: "indicatif" })];
    expect(
      code(() => valider(h, "i", { par: "Camille Fictif", le: "2026-03-01" })),
    ).toBe("indicatif_non_validable");
    const ok = [doc({ id: "v", statut: "valide" })];
    expect(
      code(() => valider(ok, "v", { par: "Camille Fictif", le: "2026-03-01" })),
    ).toBe("deja_valide");
    expect(
      code(() =>
        valider(h, "absent", { par: "Camille Fictif", le: "2026-03-01" }),
      ),
    ).toBe("document_inconnu");
    const b = [doc({ id: "b", statut: "brouillon" })];
    for (const m of [
      { par: "", le: "2026-03-01" },
      { par: "  ", le: "2026-03-01" },
      { par: "Camille Fictif", le: "" },
      { par: "Camille Fictif", le: "   " },
    ]) {
      expect(code(() => valider(b, "b", m))).toBe("validation_incomplete");
    }
  });

  it("dernier-en-vigueur-ignore-remplace", () => {
    const h = [
      doc({ id: "v1", version: 1, statut: "remplace" }),
      doc({ id: "v3", version: 3, statut: "remplace" }),
      doc({ id: "v2", version: 2, statut: "valide" }),
      doc({ id: "x", version: 9, exerciceId: "ex-2", statut: "valide" }),
    ];
    expect(dernierEnVigueur(h, "fec", "ex-1")?.id).toBe("v2");
    expect(dernierEnVigueur(h, "fec", "ex-2")?.id).toBe("x");
    expect(dernierEnVigueur(h, "pv", "ex-1")).toBeUndefined();
    expect(dernierEnVigueur([], "fec", "ex-1")).toBeUndefined();
    expect(
      dernierEnVigueur([doc({ statut: "remplace" })], "fec", "ex-1"),
    ).toBeUndefined();
  });

  it("version-invalide-refusee", () => {
    for (const version of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(code(() => ajouterVersion([doc({ version })], nouveau()))).toBe(
        "version_invalide",
      );
      expect(
        code(() => valider([doc({ version })], "doc-x", { par: "A", le: "B" })),
      ).toBe("version_invalide");
    }
    const doublon = [
      doc({ id: "a", version: 2 }),
      doc({ id: "b", version: 2 }),
    ];
    expect(code(() => ajouterVersion(doublon, nouveau()))).toBe(
      "version_invalide",
    );
    // Même version, couples différents : accepté.
    const ok = [doc({ id: "a" }), doc({ id: "b", exerciceId: "ex-2" })];
    expect(code(() => ajouterVersion(ok, nouveau()))).toBeUndefined();
  });

  it("statut-initial-refuse", () => {
    expect(code(() => ajouterVersion([], nouveau({ statut: "valide" })))).toBe(
      "validation_incomplete",
    );
    expect(
      code(() => ajouterVersion([], nouveau({ statut: "remplace" }))),
    ).toBe("validation_incomplete");
    for (const statut of ["brouillon", "a_valider", "indicatif"] as const) {
      expect(ajouterVersion([], nouveau({ statut }))[0]?.statut).toBe(statut);
    }
  });
});
