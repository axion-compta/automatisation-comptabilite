// Ventes : imputation des acomptes sur la facture de solde (spec 10, fichier 03 règle 5, fichier 02 règle 7).
import { ajouter, centimes, soustraire, type Centimes } from '../argent/index.js';
import { verifierEcriture, type Ecriture, type LigneEcriture, type StatutEcriture } from '../ecritures/modele.js';
import { ErreurVente, exigerDate, type Anomalie, type ComptesVente, type LigneTvaVente } from './types.js';

export interface AcompteImpute {
  id: string;
  ht: Centimes;
  tva: Centimes;
  ttc: Centimes;
  tauxPdb: number;
}
export interface EntreeImputation {
  id: string;
  journal: string;
  date: string;
  acomptes: readonly AcompteImpute[];
  casFacture: 'A' | 'B';
  comptes: ComptesVente;
  auxiliaire: string;
}
export interface ResultatImputation {
  ecriture: Ecriture;
  lignesTva: LigneTvaVente[];
}
export interface EntreeControleSolde {
  totalTtc: Centimes;
  acomptesTtc: readonly Centimes[];
  soldeTtc: Centimes;
}
export interface ResultatControleSolde {
  ok: boolean;
  ecart: Centimes;
  carte?: Extract<Anomalie, 'A14'>;
}

const zero = centimes(0);

function montant(v: number): Centimes {
  if (!Number.isSafeInteger(v) || v < 0) throw new ErreurVente('montant_invalide', 'Montant invalide.');
  return centimes(v);
}

function somme(valeurs: readonly Centimes[]): Centimes {
  return valeurs.reduce((s, v) => ajouter(s, montant(v)), zero);
}

export function controleSolde(e: EntreeControleSolde): ResultatControleSolde {
  const total = montant(e.totalTtc);
  const solde = montant(e.soldeTtc);
  if (e.acomptesTtc.length === 0) throw new ErreurVente('aucun_acompte', 'Aucun acompte à imputer.');
  const ecart = soustraire(total, ajouter(somme(e.acomptesTtc), solde));
  return ecart === 0 ? { ok: true, ecart } : { ok: false, ecart, carte: 'A14' };
}

export function ecritureImputation(e: EntreeImputation): ResultatImputation {
  if (e.casFacture !== 'A' && e.casFacture !== 'B') throw new ErreurVente('cas_invalide', 'Cas de facture invalide.');
  const date = exigerDate(e.date, 'date');
  if (e.acomptes.length === 0) throw new ErreurVente('aucun_acompte', 'Aucun acompte à imputer.');
  const parTaux = new Map<number, { ht: Centimes; tva: Centimes }>();
  let ttcTotal = zero;
  let htTotal = zero;
  for (const a of e.acomptes) {
    const ht = montant(a.ht);
    const tva = montant(a.tva);
    const ttc = montant(a.ttc);
    if (!Number.isSafeInteger(a.tauxPdb) || a.tauxPdb < 0) throw new ErreurVente('taux_invalide', 'Taux invalide.');
    if (ajouter(ht, tva) !== ttc) throw new ErreurVente('acompte_incoherent', 'Acompte : HT + TVA différent du TTC.');
    const deja = parTaux.get(a.tauxPdb) ?? { ht: zero, tva: zero };
    parTaux.set(a.tauxPdb, { ht: ajouter(deja.ht, ht), tva: ajouter(deja.tva, tva) });
    htTotal = ajouter(htTotal, ht);
    ttcTotal = ajouter(ttcTotal, ttc);
  }
  const compteTva = e.casFacture === 'A' ? e.comptes.tvaCollectee : e.comptes.tvaEnAttente;
  const taux = [...parTaux.keys()].sort((x, y) => x - y);
  const libelle = 'Imputation des acomptes';
  const lignes: LigneEcriture[] = [{ compte: e.comptes.avancesClients, libelle, debit: htTotal, credit: zero }];
  const lignesTva: LigneTvaVente[] = [];
  for (const t of taux) {
    const g = parTaux.get(t) as { ht: Centimes; tva: Centimes };
    if (g.tva !== 0) lignes.push({ compte: compteTva, libelle, debit: g.tva, credit: zero });
    lignesTva.push({
      compte: compteTva,
      tauxPdb: t,
      baseCentimes: centimes(-g.ht),
      tvaCentimes: centimes(-g.tva),
      codeTva: 'COLLECTEE',
      cas: e.casFacture,
      sens: 'acompte',
      dateExigibilite: e.casFacture === 'A' ? date : null,
      pieceId: e.id,
    });
  }
  const aux = e.auxiliaire === '' ? undefined : e.auxiliaire;
  lignes.push({ compte: e.comptes.client, ...(aux === undefined ? {} : { auxiliaire: aux }), libelle, debit: zero, credit: ttcTotal });
  const statut: StatutEcriture = aux === undefined ? 'brouillon' : 'propose';
  const ecriture: Ecriture = { id: e.id, journal: e.journal, date, statut, lignes };
  verifierEcriture(ecriture);
  return { ecriture, lignesTva };
}
