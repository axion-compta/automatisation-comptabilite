import { describe, expect, it } from 'vitest';
import { genererVentes, type JeuVentes, type PieceVenteFictive } from '../../../donnees-fictives/src/ventes.js';
import { ClientDetail } from '../domaines/clients.js';
import { creerServiceClients } from '../domaines/clients-service.js';

const jeu = (): JeuVentes => genererVentes();
const piece = (j: JeuVentes, code: string): PieceVenteFictive[] => (j.societes.find((s) => s.profil === 'pleine')?.pieces ?? []).filter((p) => p.clientCode === code);

/** Jeu minimal : un client, factures construites à la main. */
function jeuPaye(delais: number[], extra: (m: PieceVenteFictive) => PieceVenteFictive[] = () => []): JeuVentes {
  const j = jeu();
  const s = j.societes.find((x) => x.profil === 'pleine');
  if (!s) throw new Error('société absente');
  const modele = s.pieces[0] as PieceVenteFictive;
  s.pieces = delais.map((d, i) => ({
    ...modele,
    id: `T-${i}`,
    clientCode: 'CLI004',
    statut: 'validee',
    statutEcriture: 'valide',
    dateFacture: '2026-02-01',
    resteDuCentimes: 0,
    lettrage: 'total',
    paiements: [{ date: `2026-02-${String(1 + d).padStart(2, '0')}`, montantCentimes: modele.ttcCentimes }],
  })).concat(extra(modele));
  return j;
}

/** Facture de CLI004 payée en plusieurs fois (dates données, ordre conservé). */
const enPlusieursFois = (id: string, dates: string[], reste: number) => (m: PieceVenteFictive): PieceVenteFictive => ({
  ...m,
  id,
  clientCode: 'CLI004',
  statut: 'validee',
  statutEcriture: 'valide',
  dateFacture: '2026-02-01',
  resteDuCentimes: reste,
  lettrage: reste === 0 ? 'total' : 'partiel',
  paiements: dates.map((date) => ({ date, montantCentimes: 100 })),
});

describe('fiche client en lecture', () => {
  it('fiche-et-solde', () => {
    const j = jeu();
    const f = creerServiceClients(j).lire('CLI001');
    expect(f).toBeDefined();
    expect(ClientDetail.parse(f)).toEqual(f);
    expect(f?.nom).toBe('Immobilière Marceau');
    expect(f?.soldeCentimes).toBeGreaterThan(0);
    expect(f?.soldeCentimes).toBe(f?.facturesOuvertes.reduce((s, x) => s + x.resteDuCentimes, 0));
    expect(f?.habitude?.compteProduit).toBe('706000');
  });

  it('factures-ouvertes-seulement', () => {
    const j = jeu();
    const f = creerServiceClients(j).lire('CLI001');
    const ids = new Set(f?.facturesOuvertes.map((x) => x.id));
    expect(ids.size).toBeGreaterThan(0);
    for (const p of piece(j, 'CLI001')) {
      const attendu = p.type !== 'avoir' && p.statut !== 'doublon' && p.statutEcriture === 'valide' && p.resteDuCentimes > 0;
      expect(ids.has(p.id), p.id).toBe(attendu);
    }
  });

  it('delai-moyen-null-sans-facture-payee', () => {
    const j = jeu();
    const s = j.societes.find((x) => x.profil === 'pleine');
    if (s) s.pieces = s.pieces.filter((p) => p.clientCode !== 'CLI002').map((p) => p);
    expect(creerServiceClients(j).lire('CLI002')?.delaiMoyenJours).toBeNull();
    expect(creerServiceClients(j).lire('CLI002')?.facturesOuvertes).toEqual([]);
    expect(creerServiceClients(j).lire('CLI002')?.soldeCentimes).toBe(0);
  });

  it('delai-moyen-arrondi-inferieur', () => {
    expect(creerServiceClients(jeuPaye([10, 11])).lire('CLI004')?.delaiMoyenJours).toBe(10);
    expect(creerServiceClients(jeuPaye([10, 12])).lire('CLI004')?.delaiMoyenJours).toBe(11);
    expect(creerServiceClients(jeuPaye([4])).lire('CLI004')?.delaiMoyenJours).toBe(4);
    // payée en deux fois, paiements dans le désordre : le dernier compte (J+9)
    const deuxFois = jeuPaye([], (m) => [enPlusieursFois('T-multi', ['2026-02-10', '2026-02-04'], 0)(m)]);
    expect(creerServiceClients(deuxFois).lire('CLI004')?.delaiMoyenJours).toBe(9);
  });

  it('delai-moyen-ignore-facture-partielle', () => {
    const seule = jeuPaye([], (m) => [enPlusieursFois('T-part', ['2026-02-04'], 500)(m)]);
    expect(creerServiceClients(seule).lire('CLI004')?.delaiMoyenJours).toBeNull();
    const avecPayees = jeuPaye([10, 12], (m) => [enPlusieursFois('T-part', ['2026-02-04'], 500)(m)]);
    expect(creerServiceClients(avecPayees).lire('CLI004')?.delaiMoyenJours).toBe(11);
  });

  it('client-inconnu-404', () => {
    expect(creerServiceClients().lire('CLI999')).toBeUndefined();
    expect(creerServiceClients(jeu(), 'vide').lire('CLI001')).toBeUndefined();
  });
});
