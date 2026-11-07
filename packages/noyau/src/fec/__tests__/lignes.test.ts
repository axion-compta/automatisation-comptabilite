import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import type { Ecriture, StatutEcriture } from '../../ecritures/modele.js';
import { ErreurFec, type OptionsFec } from '../format.js';
import { type ColonneFec, type ContexteFec, lignesFec, nomFichierFec } from '../lignes.js';

const options: OptionsFec = { separateur: '|', finDeLigne: '\n', longueurMaxLibelle: 40 };

function ecr(
  id: string,
  numero: string,
  journal: string,
  statut: StatutEcriture,
  libelle = 'Libellé fictif',
  montant = 1000,
): Ecriture {
  return {
    id,
    numero,
    journal,
    date: '2026-01-15',
    statut,
    lignes: [
      { compte: '607', libelle, debit: centimes(montant), credit: centimes(0) },
      { compte: '401', libelle: 'Fournisseur', debit: centimes(0), credit: centimes(montant) },
    ],
  };
}

const contexte: ContexteFec = {
  journalANouveaux: 'AN',
  libellesComptes: { '607': 'Achats fictifs', '401': 'Fournisseurs fictifs' },
  libellesJournaux: { AC: 'Achats', AN: 'À-nouveaux' },
  datesValidation: { a: '2026-02-02', b: '2026-02-01', c: '2026-03-01', n: '2026-04-01', z: '2026-02-01',
    p: '2026-05-02',
    q: '2026-05-01',
    r: '2026-03-01',
    s: '2026-01-01',
  },
};
const colonnes: ColonneFec[] = [
  { champ: 'journalCode', entete: 'JournalCode' },
  { champ: 'ecritureNum', entete: 'EcritureNum' },
  { champ: 'compteNum', entete: 'CompteNum' },
  { champ: 'ecritureLib', entete: 'EcritureLib' },
  { champ: 'debit', entete: 'Debit' },
  { champ: 'credit', entete: 'Credit' },
];
const jeu = (): Ecriture[] => [
  ecr('a', 'AC-2', 'AC', 'valide', 'Deux', 2000),
  ecr('b', 'AC-1', 'AC', 'valide', 'Un', 1000),
  ecr('d', 'AC-9', 'AC', 'brouillon'),
  ecr('n', 'AN-1', 'AN', 'valide', 'Report', 500),
];
const numeros = (r: { lignes: string[] }): string[] =>
  r.lignes.map((l) => l.split('|')[1] ?? '');

function code(action: () => unknown): string | undefined {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurFec ? e.code : 'autre';
  }
  return undefined;
}

describe('lignes du FEC', () => {
  it('brouillon-absent', () => {
    const r = lignesFec(jeu(), contexte, colonnes, options);
    expect(r.lignes).toHaveLength(6);
    expect(numeros(r)).not.toContain('AC-9');
    const propose = ecr('d', 'AC-8', 'AC', 'propose');
    expect(lignesFec([propose], contexte, colonnes, options).lignes).toEqual([]);
  });

  it('a-nouveaux-en-premier', () => {
    const r = lignesFec(jeu(), contexte, colonnes, options);
    expect(numeros(r)[0]).toBe('AN-1');
    expect(numeros(r)[1]).toBe('AN-1');
    expect(r.lignes[0]?.startsWith('AN|')).toBe(true);
  });

  it('ordre-de-validation', () => {
    const r = lignesFec(jeu(), contexte, colonnes, options);
    expect(numeros(r)).toEqual(['AN-1', 'AN-1', 'AC-1', 'AC-1', 'AC-2', 'AC-2']);
    const egal = [ecr('z', 'AC-5', 'AC', 'valide'), ecr('b', 'AC-1', 'AC', 'valide')];
    expect(numeros(lignesFec(egal, contexte, colonnes, options))).toEqual([
      'AC-1',
      'AC-1',
      'AC-5',
      'AC-5',
    ]);
    const contradiction = [ecr('p', 'AC-1', 'AC', 'valide'), ecr('q', 'AC-2', 'AC', 'valide')];
    const obtenu = numeros(lignesFec(contradiction, contexte, colonnes, options));
    expect(obtenu).toEqual(['AC-2', 'AC-2', 'AC-1', 'AC-1']);
    const deuxANouveaux = [ecr('r', 'AN-1', 'AN', 'valide'), ecr('s', 'AN-2', 'AN', 'valide')];
    expect(numeros(lignesFec(deuxANouveaux, contexte, colonnes, options))[0]).toBe('AN-2');
    const longueur = [ecr('z', 'AC-10', 'AC', 'valide'), ecr('b', 'AC-9', 'AC', 'valide')];
    expect(numeros(lignesFec(longueur, contexte, colonnes, options))[0]).toBe('AC-9');
    const sansDate = [ecr('inconnu', 'AC-7', 'AC', 'valide')];
    expect(code(() => lignesFec(sansDate, contexte, colonnes, options))).toBe('date_invalide');
  });

  it('libelles-de-comptes-nettoyes', () => {
    const cols: ColonneFec[] = [
      { champ: 'journalLib', entete: 'JournalLib' },
      { champ: 'compteLib', entete: 'CompteLib' },
      { champ: 'compAuxLib', entete: 'CompAuxLib' },
    ];
    const ctx: ContexteFec = {
      ...contexte,
      libellesComptes: { '607': 'Achats|fictifs', '401': 'Fourn\nisseur' },
      libellesJournaux: { AC: 'Jour|nal' },
    };
    const e = ecr('b', 'AC-1', 'AC', 'valide');
    const ligne = e.lignes[0];
    if (ligne === undefined) throw new Error('jeu invalide');
    ligne.auxiliaire = '401';
    const r = lignesFec([e], ctx, cols, options);
    expect(r.lignes[0]).toBe('Journal|Achatsfictifs|Fournisseur\n');
  });

  it('totaux-egaux', () => {
    const r = lignesFec(jeu(), contexte, colonnes, options);
    expect(r.totalDebit).toBe(3500);
    expect(r.totalCredit).toBe(3500);
    expect(lignesFec([], contexte, colonnes, options).totalDebit).toBe(0);
  });

  it('colonnes-dans-l-ordre-donne', () => {
    const inverse = [...colonnes].reverse();
    const a = lignesFec(jeu(), contexte, colonnes, options);
    const b = lignesFec(jeu(), contexte, inverse, options);
    expect(a.entete).toBe('JournalCode|EcritureNum|CompteNum|EcritureLib|Debit|Credit\n');
    expect(b.entete).toBe('Credit|Debit|EcritureLib|CompteNum|EcritureNum|JournalCode\n');
    expect(a.lignes[0]).toBe('AN|AN-1|607|Report|5,00|0,00\n');
    expect(b.lignes[0]).toBe('0,00|5,00|Report|607|AN-1|AN\n');
    expect(code(() => lignesFec(jeu(), contexte, [], options))).toBe('ligne_vide');
  });

  it('libelle-de-repli', () => {
    const vide = [ecr('b', 'AC-1', 'AC', 'valide', '   ')];
    const r = lignesFec(vide, contexte, colonnes, options);
    expect(r.lignes[0]).toBe('AC|AC-1|607|Achats fictifs|10,00|0,00\n');
    const inconnu = { ...contexte, libellesComptes: {} };
    expect(lignesFec(vide, inconnu, colonnes, options).lignes[0]).toContain('|607|607|');
  });

  it('autres-champs', () => {
    const tous = (
      [
        'journalLib',
        'ecritureDate',
        'compteLib',
        'compAuxNum',
        'compAuxLib',
        'pieceRef',
        'pieceDate',
        'ecritureLet',
        'dateLet',
        'validDate',
        'montantDevise',
        'idevise',
      ] as const
    ).map((champ) => ({ champ, entete: champ }));
    const e = ecr('b', 'AC-1', 'AC', 'valide');
    const [l1] = e.lignes;
    const avecAux: Ecriture = { ...e, lignes: [{ ...(l1 as NonNullable<typeof l1>), auxiliaire: 'C1' }] };
    const r = lignesFec([avecAux], contexte, tous, options);
    expect(r.lignes[0]).toBe('Achats|20260115|Achats fictifs|C1|C1|b|20260115|||20260201||\n');
    const sans = lignesFec([e], contexte, tous, options);
    expect(sans.lignes[0]).toBe('Achats|20260115|Achats fictifs|||b|20260115|||20260201||\n');
    const repli = lignesFec([e], { ...contexte, libellesJournaux: {} }, tous, options);
    expect(repli.lignes[0]?.startsWith('AC|')).toBe(true);
  });

  it('nom-travail-puis-final', () => {
    const base = { siren: '123456782', dateCloture: '2026-03-31' };
    expect(nomFichierFec({ ...base, travail: false })).toBe('123456782FEC20260331.txt');
    expect(nomFichierFec({ ...base, travail: true })).toBe('123456782FEC20260331_TRAVAIL.txt');
    for (const siren of ['12345678', '1234567890', '12345678A', '', 'x123456782', '123456782x']) {
      expect(code(() => nomFichierFec({ ...base, siren, travail: false }))).toBe('siren_invalide');
    }
    expect(code(() => nomFichierFec({ ...base, dateCloture: '2026-02-30', travail: false }))).toBe(
      'date_invalide',
    );
  });
});
