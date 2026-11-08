// Couche RGPD devant la passerelle d'IA : exclusions par marque, pseudonymisation, fournisseur admis.
// Texte seul ; la question n'est construite qu'ici ; les événements ne portent jamais de contenu.
import { filtrer, type ObjetMarque } from '../../../../packages/noyau/src/rgpd/marques.js';
import { activationPossible, type SousTraitant } from '../../../../packages/noyau/src/rgpd/sous-traitants.js';
import { pseudonymiser } from '../../../../packages/noyau/src/banque/libelles/pseudonymiser.js';
import type { DemandeRoute } from '../../../../packages/noyau/src/securite/routes-ia.js';
import type { DemandePasserelle, ReponsePasserelle } from './passerelle.js';

export type ElementContexte = ObjetMarque & { texte: string };
export type Admission = { admis: true } | { admis: false; raisons: string[] };
export type EvenementRgpd =
  | { type: 'ia.contenu_non_texte'; client: string }
  | { type: 'ia.fournisseur_refuse'; client: string; fournisseur: string; raisons: string[] };

export function fournisseurAdmis(
  sousTraitants: readonly SousTraitant[], ref: string, reglage: { oppositionJours: number }, aujourdhui: string,
): Admission {
  const st = sousTraitants.find((s) => s.ref === ref);
  if (st === undefined) return { admis: false, raisons: ['fournisseur_inconnu'] };
  if (st.type !== 'ia') return { admis: false, raisons: ['pas_un_fournisseur_ia'] };
  const r = activationPossible(st, reglage, aujourdhui);
  return r.permise ? { admis: true } : { admis: false, raisons: [...r.raisons].sort() };
}

export interface DemandeRgpd {
  client: string;
  route: DemandeRoute;
  consigne: string;
  elements: readonly ElementContexte[];
  personnes: readonly string[];
}

export function creerPasserelleRgpd(deps: {
  demander: (d: DemandePasserelle) => Promise<ReponsePasserelle>;
  sousTraitants: readonly SousTraitant[];
  reglage: { oppositionJours: number };
  aujourdhui: () => string;
  journaliser: (e: EvenementRgpd) => void;
}) {
  async function demander(d: DemandeRgpd): Promise<ReponsePasserelle> {
    if (d.elements.some((e) => typeof e.texte !== 'string')) {
      deps.journaliser({ type: 'ia.contenu_non_texte', client: d.client });
      return { issue: 'refusee' };
    }
    const admission = fournisseurAdmis(deps.sousTraitants, d.route.fournisseur, deps.reglage, deps.aujourdhui());
    if (!admission.admis) {
      deps.journaliser({ type: 'ia.fournisseur_refuse', client: d.client, fournisseur: d.route.fournisseur, raisons: admission.raisons });
      return { issue: 'refusee' };
    }
    const gardes = filtrer(d.elements, 'ia');
    const { textes } = pseudonymiser([d.consigne, ...gardes.map((e) => e.texte)], d.personnes);
    return deps.demander({ client: d.client, route: d.route, question: textes.join('\n') });
  }
  return { demander };
}
