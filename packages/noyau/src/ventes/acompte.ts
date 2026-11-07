// Ventes : acompte encaissé avant la facture (spec 10, règle 4, VEN-030).
// Écriture proposée seulement si le paramètre d'exigibilité est au statut valide ; sinon CC-T18.
import { utilisablePourOfficiel, type ParametreLegal } from '../../../parametres/src/au-jour.js';
import { centimes, repartir, type Centimes } from '../argent/index.js';
import type { Ecriture, LigneEcriture } from '../ecritures/modele.js';
import { ErreurVente, exigerDate, type ComptesVente, type LigneTvaVente } from './types.js';

const BASE_PB = 10000;

export interface DemandeAcompte {
  id: string;
  journal: string;
  date: string;
  ttc: Centimes;
  confirmePar?: string | undefined;
  clientAuxiliaire?: string | undefined;
  tauxPdb: number | null;
  parametreExigibilite: ParametreLegal | undefined;
  comptes: ComptesVente;
}

export interface ResultatAcompte {
  etat: 'a_qualifier' | 'bloque' | 'a_verifier' | 'propose';
  ecriture: Ecriture | null;
  lignesTva: LigneTvaVente[];
  blocage?: 'CC-T18';
  cartes: string[];
}

const sans = (etat: ResultatAcompte['etat'], extra: Partial<ResultatAcompte> = {}): ResultatAcompte => ({
  etat,
  ecriture: null,
  lignesTva: [],
  cartes: [],
  ...extra,
});

export function qualifierAcompte(d: DemandeAcompte): ResultatAcompte {
  if (!Number.isSafeInteger(d.ttc) || d.ttc <= 0) throw new ErreurVente('ttc_invalide', 'Montant TTC invalide.');
  if (d.tauxPdb !== null && (!Number.isSafeInteger(d.tauxPdb) || d.tauxPdb < 0 || d.tauxPdb > BASE_PB)) {
    throw new ErreurVente('taux_invalide', 'Taux invalide.');
  }
  const date = exigerDate(d.date, 'date');
  if (d.confirmePar === undefined || d.confirmePar === '') return sans('a_qualifier');
  if (d.parametreExigibilite === undefined || !utilisablePourOfficiel(d.parametreExigibilite)) {
    return sans('bloque', { blocage: 'CC-T18' });
  }
  if (d.tauxPdb === null) return sans('a_verifier', { cartes: ['A3'] });
  const [ht, tva] = repartir(d.ttc, [BASE_PB, d.tauxPdb]) as [Centimes, Centimes];
  const zero = centimes(0);
  const lignes: LigneEcriture[] = [
    { compte: d.comptes.banque, libelle: 'acompte encaissé', debit: d.ttc, credit: zero },
    { compte: d.comptes.avancesClients, libelle: 'acompte client', debit: zero, credit: ht },
  ];
  if (d.clientAuxiliaire !== undefined) lignes[1] = { ...(lignes[1] as LigneEcriture), auxiliaire: d.clientAuxiliaire };
  if (tva !== 0) lignes.push({ compte: d.comptes.tvaCollectee, libelle: 'tva sur acompte', debit: zero, credit: tva });
  const ecriture: Ecriture = { id: `acompte:${d.id}`, journal: d.journal, date, statut: 'propose', lignes };
  const ligneTva: LigneTvaVente = {
    compte: d.comptes.tvaCollectee,
    tauxPdb: d.tauxPdb,
    baseCentimes: ht,
    tvaCentimes: tva,
    codeTva: 'COLLECTEE',
    cas: 'B',
    sens: 'acompte',
    dateExigibilite: date,
    pieceId: d.id,
  };
  return sans('propose', { ecriture, lignesTva: [ligneTva] });
}
