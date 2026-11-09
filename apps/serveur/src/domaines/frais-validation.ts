import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceFraisValidation, ErreurValidation, type ConfigValidation } from '../../../../packages/contrat/src/domaines/frais-validation-service.js';
/** Entier lu dans l'environnement (un seul endroit), sinon valeur d'essai fictive. */
const reglage = (nom: string, essai: string): number => {
  const brut = process.env[nom] ?? essai;
  const n = /^\d+$/.test(brut) ? Number(brut) : Number.NaN;
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
/** Routes de validation des frais, sur le jeu partagé créé dans `app.ts`. */
export function routesFraisValidation(service: ReturnType<typeof creerServiceFraisValidation>) {
  const os = implement(contrat.fraisValidation);
  const traduire = <T>(calcul: () => T, errors: Record<string, (o?: { data: unknown }) => Error>): T => {
    try {
      return calcul();
    } catch (e) {
      const fabrique = e instanceof ErreurValidation ? errors[e.code] : undefined;
      if (e instanceof ErreurValidation && fabrique !== undefined) throw fabrique(e.totalCentimes === undefined ? undefined : { data: { totalCentimes: e.totalCentimes } });
      throw e;
    }
  };
  return {
    proposerFrais: os.proposerFrais.handler(({ input: { params, headers: h }, errors }) => traduire(() => ({ body: service.proposer(params.id, h['idempotency-key']) }), errors)),
    validerFrais: os.validerFrais.handler(({ input: { body, headers: h }, errors }) => traduire(() => ({ body: service.valider(body, h['x-personne'], h['idempotency-key']) }), errors as never)),
    preparerRemboursement: os.preparerRemboursement.handler(({ input: { body, headers: h }, errors }) => traduire(() => ({ body: service.preparer(body, h['idempotency-key']) }), errors)),
  };
}
export { creerServiceFraisValidation };
