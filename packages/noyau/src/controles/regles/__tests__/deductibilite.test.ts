import { describe, expect, it } from "vitest";
import { centimes } from "../../../argent/index.js";
import { verifierAvantAction } from "../../garde-fou.js";
import { executerControles } from "../../moteur.js";
import type { ParametreLu } from "../commun.js";
import {
  VERIFICATIONS,
  etatDeductibilite,
  regleCCT05,
  type LigneDeductible,
  type Verification,
} from "../deductibilite.js";

const MENTIONS: ParametreLu = {
  cle: "mentions.test",
  valeur: "numero_tva_fournisseur",
  statut: "valide",
};
const TOUT: Partial<Record<Verification, "ok" | "echec">> = {
  nom_societe: "ok",
  mentions: "ok",
  nature: "ok",
  date_deduction: "ok",
  paiement: "ok",
};
const ligne = (o: Partial<LigneDeductible> = {}): LigneDeductible => ({
  ligneId: "l1",
  tvaDeductible: centimes(4000),
  verifications: { ...TOUT },
  fournisseurSurEncaissements: true,
  ...o,
});
const sans = (v: Verification) => {
  const reste = { ...TOUT };
  delete reste[v];
  return reste;
};
const eval1 = (l: LigneDeductible, p: ParametreLu = MENTIONS) =>
  regleCCT05.evaluer({ ligne: l, mentionsExigees: p });

describe("controle CC-T05 deductibilite", () => {
  // Facture sans numero de TVA du fournisseur : verification absente, IMPOSSIBLE.
  it("CT-22", () => {
    const l = ligne({ verifications: sans("mentions") });
    expect(etatDeductibilite(l, MENTIONS)).toBe("impossible");
    expect(eval1(l)).toEqual({ resultat: "IMPOSSIBLE" });
  });

  it("cinq-ok", () => {
    expect(VERIFICATIONS).toEqual([
      "nom_societe",
      "mentions",
      "nature",
      "date_deduction",
      "paiement",
    ]);
    expect(Object.isFrozen(VERIFICATIONS)).toBe(true);
    expect(etatDeductibilite(ligne(), MENTIONS)).toBe("ok");
    expect(eval1(ligne())).toEqual({ resultat: "OK" });
    expect(regleCCT05.id).toBe("CC-T05");
    expect(regleCCT05.version).toBe(1);
    expect(regleCCT05.gravite).toBe("B");
    expect(regleCCT05.bloque).toEqual(["tva"]);
    expect(regleCCT05.declencheurs).toEqual([
      "arrivee",
      "continu",
      "avant_tva",
      "a_la_demande",
    ]);
  });

  it("tva-nulle-sans-trace-ok", () => {
    const l = ligne({ tvaDeductible: centimes(0), verifications: {} });
    expect(etatDeductibilite(l, MENTIONS)).toBe("ok");
    expect(
      etatDeductibilite(
        ligne({ tvaDeductible: centimes(1), verifications: {} }),
        MENTIONS,
      ),
    ).toBe("impossible");
    expect(
      etatDeductibilite(l, { ...MENTIONS, statut: "absent", valeur: null }),
    ).toBe("ok");
    for (const v of [Number.NaN, Number.POSITIVE_INFINITY, 1.5, -1]) {
      expect(() => eval1(ligne({ tvaDeductible: v as never }))).toThrow();
    }
  });

  it("paiement-non-exige-hors-encaissements", () => {
    const l = ligne({
      fournisseurSurEncaissements: false,
      verifications: sans("paiement"),
    });
    expect(etatDeductibilite(l, MENTIONS)).toBe("ok");
    expect(
      etatDeductibilite(
        { ...l, verifications: { ...sans("paiement"), paiement: "echec" } },
        MENTIONS,
      ),
    ).toBe("ok");
  });

  it("paiement-absent-sur-encaissements-impossible", () => {
    const l = ligne({ verifications: sans("paiement") });
    expect(etatDeductibilite(l, MENTIONS)).toBe("impossible");
    for (const v of VERIFICATIONS) {
      expect(
        etatDeductibilite(ligne({ verifications: sans(v) }), MENTIONS),
      ).toBe("impossible");
    }
    const meleeAbsentEchec = ligne({
      verifications: { ...sans("paiement"), nature: "echec" },
    });
    expect(etatDeductibilite(meleeAbsentEchec, MENTIONS)).toBe("impossible");
  });

  it("echec-nomme-la-verification", () => {
    for (const v of VERIFICATIONS) {
      const l = ligne({ verifications: { ...TOUT, [v]: "echec" } });
      expect(etatDeductibilite(l, MENTIONS)).toBe("echec");
      expect(eval1(l)).toEqual({ resultat: "ALERTE", valeur: v });
    }
    const deux = ligne({
      verifications: { ...TOUT, paiement: "echec", nature: "echec" },
    });
    expect(eval1(deux)).toEqual({ resultat: "ALERTE", valeur: "nature" });
    const inverse = ligne({
      verifications: {
        paiement: "echec",
        date_deduction: "ok",
        nature: "echec",
        mentions: "ok",
        nom_societe: "ok",
      },
    });
    expect(etatDeductibilite(inverse, MENTIONS)).toBe("echec");
    expect(eval1(inverse)).toEqual({ resultat: "ALERTE", valeur: "nature" });
    expect(etatDeductibilite(ligne({ verifications: {} }), MENTIONS)).toBe(
      "impossible",
    );
  });

  it("parametre-mentions-a-verifier-impossible", () => {
    for (const statut of ["a_verifier", "non_verifie", "absent"] as const) {
      expect(etatDeductibilite(ligne(), { ...MENTIONS, statut })).toBe(
        "impossible",
      );
    }
    expect(etatDeductibilite(ligne(), { ...MENTIONS, valeur: null })).toBe(
      "impossible",
    );
    expect(eval1(ligne(), { ...MENTIONS, statut: "a_verifier" })).toEqual({
      resultat: "IMPOSSIBLE",
    });
  });

  it("impossible-bloque-le-garde-fou", () => {
    const l = ligne({ verifications: sans("mentions") });
    const traces = executerControles(
      [regleCCT05],
      [
        {
          type: "ligne",
          id: "l1",
          donnee: { ligne: l, mentionsExigees: MENTIONS },
        },
      ],
      "avant_tva",
      "2026-01-15T10:00:00Z",
    );
    expect(traces[0]?.resultat).toBe("IMPOSSIBLE");
    const verdict = verifierAvantAction(traces, [regleCCT05], "tva");
    expect(verdict.autorise).toBe(false);
    expect(verdict.bloquants).toEqual([{ regleId: "CC-T05", objetId: "l1" }]);
    expect(verifierAvantAction(traces, [regleCCT05], "export").autorise).toBe(
      true,
    );
    const montantNaN = executerControles(
      [regleCCT05],
      [
        {
          type: "ligne",
          id: "l2",
          donnee: {
            ligne: ligne({ tvaDeductible: Number.NaN as never }),
            mentionsExigees: MENTIONS,
          },
        },
      ],
      "avant_tva",
      "2026-01-15T10:00:00Z",
    );
    expect(montantNaN[0]?.resultat).toBe("IMPOSSIBLE");
  });
});
