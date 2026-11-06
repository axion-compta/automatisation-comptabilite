import { defineAutomation } from './contrat.mjs';

const cas = [];
for (let i = 1; i <= 18; i += 1) {
  cas.push({ id: `cas-${i}`, type: 'normal', entree: { reference: `FICT-${i}`, siren: '123456782' } });
}
cas.push({ id: 'cas-19', type: 'panne', entree: { reference: 'FICT-19', panne: 'service-indisponible' } });
cas.push({ id: 'cas-20', type: 'email-piege', entree: { reference: 'FICT-20', expediteur: 'piege@exemple.fr' } });

export default defineAutomation({
  code: 'exemple-vide',
  version: '0.0.1',
  permissions: [],
  actif: false,
  jeuEssai: cas,
  migrer: () => ['CREATE TABLE exemple_vide (id integer)'],
});
