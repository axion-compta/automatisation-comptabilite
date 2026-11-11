import { describe, expect, it } from 'vitest';
import { genererVentes } from '../../../donnees-fictives/src/ventes.js';
import { centimes } from '../../../noyau/src/argent/index.js';
import { etatAffiche } from '../../../noyau/src/ventes/etat.js';
import { creerServiceVentes } from '../domaines/ventes-service.js';

const jeu = genererVentes();
const societe = jeu.societes[0]!;
const service = creerServiceVentes();
const tout = service.lister({ limite: 100 });

describe('service ventes', () => {
  it('liste-enveloppe-et-tri', () => {
    expect(tout.decalage).toBe(0);
    expect(tout.total).toBe(tout.body.length);
    for (let i = 1; i < tout.body.length; i++) {
      const a = tout.body[i - 1]!;
      const b = tout.body[i]!;
      const ordre = a.dateFacture === b.dateFacture ? a.id < b.id : a.dateFacture > b.dateFacture;
      expect(ordre).toBe(true);
    }
    const page = service.lister({ limite: 3, decalage: 2 });
    expect(page.decalage).toBe(2);
    expect(page.total).toBe(tout.total);
    expect(page.body.map((v) => v.id)).toEqual(tout.body.slice(2, 5).map((v) => v.id));
  });

  it('filtre-par-etat', () => {
    const r = service.lister({ etat: 'en_retard', limite: 100 });
    expect(r.total).toBeGreaterThan(0);
    expect(r.body.every((v) => v.etat === 'en_retard')).toBe(true);
    expect(r.body.every((v) => (v.joursDeRetard ?? 0) > 0)).toBe(true);
    for (const v of r.body) {
      const p = societe.pieces.find((x) => x.id === v.id)!;
      const jours = Math.round((Date.parse(`${jeu.dateReference}T00:00:00Z`) - Date.parse(`${p.echeance}T00:00:00Z`)) / 86400000);
      expect(v.joursDeRetard, v.id).toBe(jours);
    }
    expect(tout.body.filter((v) => v.etat !== 'en_retard').every((v) => v.joursDeRetard === undefined)).toBe(true);
    expect(service.lister({ etat: 'inconnu' }).total).toBe(0);
  });

  it('filtre-par-client-et-mois', () => {
    const c = service.lister({ client: 'CLI001', limite: 100 });
    expect(c.total).toBeGreaterThan(0);
    expect(c.body.every((v) => v.client?.code === 'CLI001')).toBe(true);
    const mois = tout.body[0]!.dateFacture.slice(0, 7);
    const m = service.lister({ mois, limite: 100 });
    expect(m.total).toBeGreaterThan(0);
    expect(m.body.every((v) => v.dateFacture.startsWith(mois))).toBe(true);
    const both = service.lister({ client: 'CLI001', mois, limite: 100 });
    expect(both.body.every((v) => v.client?.code === 'CLI001' && v.dateFacture.startsWith(mois))).toBe(true);
    expect(service.lister({ mois: '1999-01' }).total).toBe(0);
  });

  it('avoir-sous-sa-facture', () => {
    const avoir = societe.pieces.find((p) => p.type === 'avoir' && p.factureOrigineId !== undefined)!;
    expect(tout.body.some((v) => v.id === avoir.id)).toBe(false);
    const facture = tout.body.find((v) => v.id === avoir.factureOrigineId)!;
    expect(facture.avoirsLies).toEqual([{ id: avoir.id, ttcCentimes: avoir.ttcCentimes }]);
    expect(service.lire(facture.id)?.avoirsLies).toHaveLength(1);
    const orphelin = societe.pieces.find((p) => p.type === 'avoir' && p.factureOrigineId === undefined)!;
    expect(tout.body.some((v) => v.id === orphelin.id)).toBe(true);
  });

  it('etat-coherent-avec-le-noyau', () => {
    for (const p of societe.pieces) {
      const attendu = etatAffiche({
        statutPiece: p.statut, ...(p.statutEcriture ? { statutEcriture: p.statutEcriture } : {}), resteDu: centimes(p.resteDuCentimes),
        ...(p.echeance ? { echeance: p.echeance } : {}), dateReference: jeu.dateReference, enLitige: p.enLitige, lettrage: p.lettrage,
      });
      expect(service.lire(p.id)?.etat, p.id).toBe(attendu);
    }
  });

  it('detail-complet', () => {
    const p = societe.pieces.find((x) => x.paiements.length > 0 && x.cartes.length === 0)!;
    const d = service.lire(p.id)!;
    expect(d.origine).toBe(p.origine);
    expect(d.lignes).toHaveLength(p.lignes.length);
    expect(d.paiements).toEqual(p.paiements.map((x) => ({ date: x.date, montantCentimes: x.montantCentimes })));
    expect(d.ecriture?.lignes.length).toBeGreaterThan(0);
    const debit = d.ecriture!.lignes.reduce((s, l) => s + l.debitCentimes, 0);
    const credit = d.ecriture!.lignes.reduce((s, l) => s + l.creditCentimes, 0);
    expect(debit).toBe(credit);
    const avecCarte = societe.pieces.find((x) => x.cartes.length > 0)!;
    expect(service.lire(avecCarte.id)?.cartes.map((c) => c.code)).toEqual(avecCarte.cartes);
  });

  it('ecritures-equilibrees-sur-toutes-les-pieces', () => {
    let nb = 0;
    for (const p of societe.pieces) {
      const e = service.lire(p.id)?.ecriture;
      if (!e) continue;
      nb++;
      const debit = e.lignes.reduce((s, l) => s + l.debitCentimes, 0);
      const credit = e.lignes.reduce((s, l) => s + l.creditCentimes, 0);
      expect(debit, p.id).toBe(credit);
    }
    expect(nb).toBeGreaterThan(0);
  });

  it('vente-inconnue-404', () => {
    expect(service.lire('VP-9-999')).toBeNull();
  });
});
