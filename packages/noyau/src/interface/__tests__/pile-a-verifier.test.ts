import { describe, expect, it } from "vitest";
import {
  ErreurPile,
  construirePile,
  reporter,
  type CartePile,
} from "../pile-a-verifier.js";

const MAINTENANT = Date.UTC(2026, 10, 12, 10, 0, 0); // 12/11/2026 10:00 UTC
const UTC = "UTC";

function carte(id: string, o: Partial<CartePile> = {}): CartePile {
  return {
    id,
    fait: "fait-" + id,
    groupe: 1,
    echeance: "2026-12-01",
    tvaEnJeu: 1000,
    datePiece: "2026-10-01",
    propositions: [],
    ...o,
  };
}
const ids = (p: readonly { id: string }[]): string[] => p.map((c) => c.id);

describe("pile « À vérifier »", () => {
  it("tri-groupe-echeance-tva-date", () => {
    const pile = construirePile(
      [
        carte("e", { datePiece: "2026-10-05" }),
        carte("d", { datePiece: "2026-10-02" }),
        carte("c", { tvaEnJeu: 5000 }),
        carte("b", { echeance: "2026-11-20" }),
        carte("a", { groupe: 0 }),
        carte("z", { echeance: undefined }),
      ],
      MAINTENANT,
      UTC,
    );
    // groupe 0 d'abord ; puis échéance proche ; sans échéance en dernier ; puis TVA décroissante ; puis date ; puis id.
    expect(ids(pile)).toEqual(["a", "b", "c", "d", "e", "z"]);
    expect(pile.map((c) => c.rang)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("tri-stable-identifiant-en-dernier", () => {
    const pile = construirePile(
      [carte("m"), carte("k"), carte("l")],
      MAINTENANT,
      UTC,
    );
    expect(ids(pile)).toEqual(["k", "l", "m"]);
  });

  it("raison-du-rang-fournie", () => {
    const pile = construirePile(
      [
        carte("a", { groupe: 0 }),
        carte("b", { echeance: "2026-11-20" }),
        carte("c", { tvaEnJeu: 5000 }),
        carte("d", { datePiece: "2026-09-01" }),
        carte("e"),
        carte("f"),
      ],
      MAINTENANT,
      UTC,
    );
    expect(pile.map((c) => c.raison)).toEqual([
      "groupe",
      "echeance",
      "tva",
      "date_piece",
      "identifiant",
      "identifiant",
    ]);
  });

  it("cartes-du-meme-fait-groupees", () => {
    const pile = construirePile(
      [
        carte("b", { fait: "F", tvaEnJeu: 300, echeance: "2026-12-10" }),
        carte("a", { fait: "F", tvaEnJeu: 200, echeance: "2026-11-30" }),
        carte("c", { fait: "G" }),
      ],
      MAINTENANT,
      UTC,
    );
    expect(pile).toHaveLength(2);
    const g = pile.find((c) => c.fait === "F")!;
    expect(g.nombre).toBe(2);
    expect(g.ids).toEqual(["a", "b"]);
    expect(g.tvaEnJeu).toBe(500);
    expect(g.echeance).toBe("2026-11-30");
    const h = construirePile(
      [
        carte("x", { fait: "H", groupe: 3 }),
        carte("y", { fait: "H", groupe: 2 }),
      ],
      MAINTENANT,
      UTC,
    );
    expect(h[0]!.groupe).toBe(2);
    expect(pile.find((c) => c.fait === "G")!.nombre).toBe(1);
  });

  it("reponse-preselectionnee-la-plus-sure", () => {
    const pile = construirePile(
      [
        carte("a", {
          propositions: [
            { id: "p1", confiance: 0.4 },
            { id: "p2", confiance: 0.9 },
            { id: "p3", confiance: 0.6 },
          ],
        }),
      ],
      MAINTENANT,
      UTC,
    );
    expect(pile[0]!.preselection).toBe("p2");
  });

  it("egalite-aucune-preselection", () => {
    const egal = construirePile(
      [
        carte("a", {
          propositions: [
            { id: "p1", confiance: 0.9 },
            { id: "p2", confiance: 0.9 },
            { id: "p3", confiance: 0.1 },
          ],
        }),
      ],
      MAINTENANT,
      UTC,
    );
    expect(egal[0]!.preselection).toBeUndefined();
    const aucune = construirePile([carte("b")], MAINTENANT, UTC);
    expect(aucune[0]!.preselection).toBeUndefined();
    // La même proposition vue deux fois dans un groupe n'est pas une égalité.
    const groupe = construirePile(
      [
        carte("c", { fait: "F", propositions: [{ id: "p1", confiance: 0.8 }] }),
        carte("d", {
          fait: "F",
          propositions: [
            { id: "p1", confiance: 0.8 },
            { id: "p2", confiance: 0.3 },
          ],
        }),
      ],
      MAINTENANT,
      UTC,
    );
    expect(groupe[0]!.preselection).toBe("p1");
  });

  it("plus-tard-masque-jusqu-au-lendemain", () => {
    const a = reporter(carte("a"), MAINTENANT, UTC);
    expect(a.masqueJusqu).toBe(Date.UTC(2026, 10, 13, 0, 0, 0));
    expect(
      construirePile([a, carte("b")], MAINTENANT, UTC).map((c) => c.id),
    ).toEqual(["b"]);
    // Une minute avant minuit : toujours masquée.
    expect(
      construirePile([a], Date.UTC(2026, 10, 12, 23, 59, 59), UTC),
    ).toEqual([]);
    // Fuseau de la société : à 23:30 UTC le 12, il est déjà le 13 à Paris (UTC+1 en novembre).
    const p = reporter(
      carte("p"),
      Date.UTC(2026, 10, 12, 23, 30, 0),
      "Europe/Paris",
    );
    expect(p.masqueJusqu).toBe(Date.UTC(2026, 10, 13, 23, 0, 0));
  });

  it("plus-tard-revient-le-lendemain", () => {
    const a = reporter(carte("a"), MAINTENANT, UTC);
    const minuit = Date.UTC(2026, 10, 13, 0, 0, 0);
    expect(ids(construirePile([a], minuit - 1, UTC))).toEqual([]);
    expect(ids(construirePile([a], minuit, UTC))).toEqual(["a"]);
    expect(ids(construirePile([a], minuit + 1, UTC))).toEqual(["a"]);
  });

  it("pile-vide", () => {
    expect(construirePile([], MAINTENANT, UTC)).toEqual([]);
  });

  it("entrees-invalides-refusees", () => {
    const code = (f: () => unknown): string | undefined => {
      try {
        f();
      } catch (e) {
        if (e instanceof ErreurPile) return e.code;
        throw e;
      }
      return undefined;
    };
    expect(code(() => construirePile([], Number.NaN, UTC))).toBe(
      "instant_invalide",
    );
    expect(
      code(() => reporter(carte("a"), Number.POSITIVE_INFINITY, UTC)),
    ).toBe("instant_invalide");
    expect(code(() => reporter(carte("a"), MAINTENANT, "Nulle/Part"))).toBe(
      "fuseau_invalide",
    );
    expect(
      code(() =>
        construirePile([carte("a", { tvaEnJeu: -1 })], MAINTENANT, UTC),
      ),
    ).toBe("carte_invalide");
    expect(
      code(() =>
        construirePile([carte("a", { tvaEnJeu: Number.NaN })], MAINTENANT, UTC),
      ),
    ).toBe("carte_invalide");
    expect(
      code(() =>
        construirePile([carte("a", { tvaEnJeu: 0 })], MAINTENANT, UTC),
      ),
    ).toBeUndefined();
    expect(
      code(() =>
        construirePile(
          [carte("a", { propositions: [{ id: "p", confiance: Number.NaN }] })],
          MAINTENANT,
          UTC,
        ),
      ),
    ).toBe("carte_invalide");
  });
});
