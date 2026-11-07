// Jeu fictif de sécurité (V3-PLA-002, V3-QUA-018). Noms, e-mails et dates inventés ; rôles et permissions en chaînes.
const figer = <T>(v: T): T => {
  if (typeof v === 'object' && v !== null) for (const x of Object.values(v)) figer(x);
  return Object.freeze(v);
};

const TOUTES = ['compta-lire', 'compta-deposer', 'compta-saisir', 'compta-valider', 'compta-lever-bloquant', 'compta-cloturer', 'compta-exporter', 'compta-parametrer', 'compta-equipe', 'compta-commenter', 'compta-pieces-sensibles'];
const UTILISATEUR = TOUTES.filter((p) => !['compta-lever-bloquant', 'compta-cloturer', 'compta-parametrer', 'compta-equipe'].includes(p));
const LECTURE_ECHANGE = ['compta-lire', 'compta-exporter', 'compta-commenter'];

export const JEU_SECURITE = figer({
  clients: [{ id: 'client-x' }, { id: 'client-y' }],
  societes: [
    { id: 'soc-a', clientId: 'client-x', nom: 'Société A' },
    { id: 'soc-b', clientId: 'client-x', nom: 'Société B' },
    { id: 'soc-c', clientId: 'client-y', nom: 'Société C' },
  ],
  personnes: [
    { id: 'adms-a', role: 'administrateur', permissions: TOUTES, societes: ['soc-a', 'soc-b'], email: 'adms-a@exemple.fr' },
    { id: 'dir-a', role: 'utilisateur', permissions: UTILISATEUR, societes: ['soc-a'], email: 'dir-a@exemple.fr' },
    { id: 'lec-a', role: 'lecture', permissions: ['compta-lire'], societes: ['soc-a'], email: 'lec-a@exemple.fr' },
    { id: 'exp-a', role: 'comptable', permissions: LECTURE_ECHANGE, societes: ['soc-a'], email: 'exp-a@exemple.fr' },
    { id: 'inv-a', role: 'invite_externe', permissions: LECTURE_ECHANGE, societes: ['soc-a'], email: 'inv-a@exemple.fr' },
    { id: 'axion-1', role: 'personnel_axion', permissions: ['compta-lire'], societes: [], email: 'axion-1@exemple.fr' },
  ],
  accesExperts: [{ personneId: 'inv-a', societeId: 'soc-a', exercice: '2026', journaux: ['ACH'], comptesBancaires: [], echeance: '2026-12-31' }],
  modes: [{ id: 'saisie_seule', retire: ['cloturer', 'valider'], raison: 'mode_saisie_seule' }],
});
