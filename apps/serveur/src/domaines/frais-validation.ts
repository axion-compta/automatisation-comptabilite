import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import type { ContexteProfil } from './profil.js';
import { exigerDroit } from './frais.js';
import { creerServiceFraisValidation, ErreurValidation, type ConfigValidation } from '../../../../packages/contrat/src/domaines/frais-validation-service.js';
import { creerBoiteEnvoiMemoire } from '../../../../packages/noyau/src/evenements/memoire.js';
import type { UniteDeTravail } from '../../../../packages/noyau/src/evenements/publication.js';
import { creerFraisPublies, type ContexteFrais } from './frais-evenements.js';
/** Entier lu dans l'environnement (un seul endroit), sinon valeur d'essai fictive. */
const reglage = (nom: string, essai: string): number => {
  const n = /^\d+$/.test(process.env[nom] ?? essai) ? Number(process.env[nom] ?? essai) : Number.NaN;
  if (!Number.isSafeInteger(n)) throw new Error(`Réglage ${nom} invalide : entier positif ou nul attendu`);
  return n;
};
const ANNEES_ESSAI = [2025, 2026];
/** Réglages d'essai fictifs : en production, ils viennent de la configuration datée du serveur. */
export function configEssai(): ConfigValidation {
  return {
    comptes: { chargeParNature: { repas_affaires: '625700', carburant: '606100', parking: '625100' }, chargeIk: '625110', tvaDeductible: '445660', comptePersonne: '467000', banque: '512000' },
    journal: 'OD',
    periodes: ANNEES_ESSAI.map((a) => ({ debut: `${a}-01-01`, fin: `${a}-12-31`, ouverte: true })),
    seuilLotNombre: reglage('FRAIS_SEUIL_LOT_NOMBRE', '5'),
    seuilLotMontantCentimes: reglage('FRAIS_SEUIL_LOT_MONTANT', '100000'),
    delaiAnnulationMs: reglage('FRAIS_DELAI_ANNULATION_MS', '60000'),
    maintenant: () => Date.now(),
  };
}
const contexte = (societeId: string, personne: string | undefined, cle: string): ContexteFrais => ({
  societeId, acteur: personne === undefined ? { type: 'systeme', id: 'systeme' } : { type: 'personne', id: personne }, canal: 'api', correlationId: cle, cleIdempotence: cle, horodatage: new Date().toISOString(),
});
/** Routes de validation des frais, sur le jeu partagé créé dans `app.ts` ; chaque transition dépose ses événements dans la boîte d'envoi (en mémoire par défaut). */
export function routesFraisValidation(service: ReturnType<typeof creerServiceFraisValidation>, unite: UniteDeTravail = creerBoiteEnvoiMemoire()) {
  const publies = creerFraisPublies(service, unite);
  const os = implement(contrat.fraisValidation).$context<ContexteProfil>();
  const traduire = async <T>(calcul: () => Promise<T>, errors: Record<string, (o?: { data: unknown }) => Error>): Promise<T> => {
    try {
      return await calcul();
    } catch (e) {
      const fabrique = e instanceof ErreurValidation ? errors[e.code] : undefined;
      if (e instanceof ErreurValidation && fabrique !== undefined) throw fabrique(e.totalCentimes === undefined ? undefined : { data: { totalCentimes: e.totalCentimes } });
      throw e;
    }
  };
  return {
    proposerFrais: os.proposerFrais.handler(({ input: { params, headers: h }, errors, context }) => traduire(async () => (exigerDroit(context, params.s, 'compta-valider'), { body: await publies.proposer(contexte(params.s, undefined, h['idempotency-key']), params.id) }), errors)),
    validerFrais: os.validerFrais.handler(({ input: { params, body, headers: h }, errors, context }) => traduire(async () => ({ body: await publies.valider(contexte(params.s, exigerDroit(context, params.s, 'compta-valider').personneId, h['idempotency-key']), body) }), errors as never)),
    preparerRemboursement: os.preparerRemboursement.handler(({ input: { params, body, headers: h }, errors, context }) => traduire(async () => (exigerDroit(context, params.s, 'compta-valider'), { body: await publies.preparer(contexte(params.s, undefined, h['idempotency-key']), body) }), errors)),
  };
}
export { creerServiceFraisValidation };
