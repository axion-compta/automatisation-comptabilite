// Jeu fictif de la hiérarchie des agents (V3-QUA-014) : constats, citations et coûts inventés, sans aléa.
// Les coûts sont en micro-centimes entiers. Le registre de sources est fictif (identifiants inventés).
export const POLES_JEU = ['comptabilite', 'fiscalite', 'juridique', 'rgpd_securite'] as const;
export const GRAVITES_JEU = ['critique', 'majeur', 'mineur', 'info'] as const;

export type ConstatJeu = {
  id: string;
  type: string;
  gravite: (typeof GRAVITES_JEU)[number];
  pole: (typeof POLES_JEU)[number];
  escaladeAttendue: boolean;
  refusAttendu: boolean;
  citations: string[];
  coutMicroCentimes: number;
};

/** Propriétaire de chaque type de constat (deux types par pôle). */
export const TABLE_JEU: Readonly<Record<string, (typeof POLES_JEU)[number]>> = Object.freeze({
  ecart_balance: 'comptabilite',
  piece_sans_ecriture: 'comptabilite',
  tva_incoherente: 'fiscalite',
  echeance_manquee: 'fiscalite',
  clause_manquante: 'juridique',
  mention_absente: 'juridique',
  donnee_exposee: 'rgpd_securite',
  acces_excessif: 'rgpd_securite',
});

export const REGISTRE_JEU = Object.freeze([
  { id: 'SRC-FICT-1', version: '1', source: 'Source fictive 1', dateReleve: '2026-01-10', lectures: 2 },
  { id: 'SRC-FICT-2', version: '1', source: 'Source fictive 2', dateReleve: '2026-01-11', lectures: 2 },
  { id: 'SRC-FICT-3', version: '2', source: 'Source fictive 3', dateReleve: '2026-02-01', lectures: 3 },
  { id: 'SRC-FICT-4', version: '1', source: 'Source fictive 4', dateReleve: '2026-02-15', lectures: 2 },
]);

const TYPES = Object.keys(TABLE_JEU);

function construire(): ConstatJeu[] {
  const liste: ConstatJeu[] = [];
  for (let i = 0; i < 48; i += 1) {
    const gravite = GRAVITES_JEU[Math.floor(i / 4) % 4] as ConstatJeu['gravite'];
    const pole = POLES_JEU[i % 4] as ConstatJeu['pole'];
    const types = TYPES.filter((t) => TABLE_JEU[t] === pole);
    const type = types[Math.floor(i / 16) % types.length] as string;
    const source = REGISTRE_JEU[i % REGISTRE_JEU.length] as (typeof REGISTRE_JEU)[number];
    const citations = [`DEC-001:${source.id}@${source.version}`];
    if (i % 5 === 0) {
      const autre = REGISTRE_JEU[(i + 1) % REGISTRE_JEU.length] as (typeof REGISTRE_JEU)[number];
      citations.push(`DEC-001:${autre.id}@${autre.version}`);
    }
    liste.push({
      id: `constat-${String(i + 1).padStart(3, '0')}`,
      type,
      gravite,
      pole,
      escaladeAttendue: gravite === 'critique',
      refusAttendu: i % 7 === 0,
      citations,
      coutMicroCentimes: 1000 + ((i * 37) % 11) * 250,
    });
  }
  return liste;
}

export const JEU_HIERARCHIE: readonly ConstatJeu[] = Object.freeze(construire().map((c) => Object.freeze(c)));
