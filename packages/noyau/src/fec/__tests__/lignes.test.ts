import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import type { Ecriture, StatutEcriture } from '../../ecritures/modele.js';
import { ErreurFec, type OptionsFec } from '../format.js';
import { type ChampFec, type ColonneFec, type ContexteFec, lignesFec, nomFichierFec } from '../lignes.js';

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
    const cas = (specs: [string, string, string][], attendu: string[]): void => {
      const entrees = specs.map(([id, n, j]) => ecr(id, n, j, 'valide'));
      for (const e of [entrees, [...entrees].reverse(), [...entrees.slice(1), ...entrees.slice(0, 1)]]) {
        expect(numeros(lignesFec(e, contexte, colonnes, options))).toEqual(attendu);
      }
    };
    const doubles = (...n: string[]): string[] => n.flatMap((x) => [x, x]);
    const inv = numeros(lignesFec(jeu().reverse(), contexte, colonnes, options));
    expect(inv).toEqual(doubles('AN-1', 'AC-1', 'AC-2'));
    cas([['z', 'AC-5', 'AC'], ['b', 'AC-1', 'AC']], doubles('AC-1', 'AC-5'));
    cas([['p', 'AC-1', 'AC'], ['q', 'AC-2', 'AC']], doubles('AC-2', 'AC-1'));
    cas([['r', 'AN-1', 'AN'], ['s', 'AN-2', 'AN']], doubles('AN-2', 'AN-1'));
    cas([['z', 'AC-10', 'AC'], ['b', 'AC-9', 'AC']], doubles('AC-9', 'AC-10'));
    cas([['c', 'AC-1', 'AC'], ['b', 'AC-3', 'AC'], ['a', 'AC-2', 'AC']], doubles('AC-3', 'AC-2', 'AC-1'));
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
    const l = (compte: string, debit: number, credit: number) => ({ compte, libelle: 'x', debit: centimes(debit), credit: centimes(credit) });
    const d = lignesFec([{ ...ecr('b', 'AC-1', 'AC', 'valide'), lignes: [l('607', 1000, 0), l('401', 0, 700)] }], contexte, colonnes, options);
    expect([d.totalDebit, d.totalCredit]).toEqual([1000, 700]);
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

  it('date-de-validation-mal-formee-refusee', () => {
    const avec = (date: string): ContexteFec => ({ ...contexte, datesValidation: { v: date } });
    const mauvaises = [
      '2026-3-1',
      '20260331',
      '2026-02-30',
      '2026-02-29',
      '2026-13-01',
      '2026-00-10',
      '2026-01-00',
      '',
      ' ',
      'NaN',
      'Infinity',
      '-Infinity',
      '2026-03-31 ',
      ' 2026-03-31',
      '2026-03-31\n',
      '2026-03-31T00:00:00Z',
      '2026-03-1.5',
    ];
    const sansLigne: Ecriture = { ...ecr('v', 'AC-1', 'AC', 'valide'), lignes: [] };
    for (const date of mauvaises) {
      expect(code(() => lignesFec([ecr('v', 'AC-1', 'AC', 'valide')], avec(date), colonnes, options))).toBe(
        'date_invalide',
      );
      expect(code(() => lignesFec([sansLigne], avec(date), colonnes, options))).toBe('date_invalide');
      const deux = [ecr('v', 'AC-1', 'AC', 'valide'), ecr('w', 'AC-2', 'AC', 'valide')];
      const ctx = { ...contexte, datesValidation: { v: date, w: '2026-01-01' } };
      expect(code(() => lignesFec(deux, ctx, colonnes, options))).toBe('date_invalide');
      expect(code(() => lignesFec([...deux].reverse(), ctx, colonnes, options))).toBe('date_invalide');
      const brouillon = ecr('v', 'AC-1', 'AC', 'brouillon');
      expect(lignesFec([brouillon], avec(date), colonnes, options).lignes).toEqual([]);
    }
    for (const date of ['2026-02-28', '2028-02-29', '2026-12-31']) {
      expect(lignesFec([ecr('v', 'AC-1', 'AC', 'valide')], avec(date), colonnes, options).lignes).toHaveLength(2);
    }
    expect(lignesFec([sansLigne], avec('2026-02-28'), colonnes, options).lignes).toEqual([]);
  });

  it('numero-absent-repli-vide', () => {
    const sansNumero = (id: string, montant = 1000): Ecriture => {
      const e = ecr(id, 'AC-0', 'AC', 'valide', 'Libellé fictif', montant);
      delete e.numero;
      return e;
    };
    const ctx: ContexteFec = {
      ...contexte,
      datesValidation: { x: '2026-06-01', y: '2026-06-01', m: '2026-06-01', t: '2026-06-02', u: '2026-05-01' },
    };
    const lire = (es: Ecriture[]) => lignesFec(es, ctx, colonnes, options);
    // Colonne vide, numéro non remplacé par l'identifiant.
    expect(lire([sansNumero('x')]).lignes).toEqual([
      'AC||607|Libellé fictif|10,00|0,00\n',
      'AC||401|Fournisseur|0,00|10,00\n',
    ]);
    // Deux écritures sans numéro, même date, même contenu : même fichier dans les deux ordres.
    const memes = [sansNumero('x'), sansNumero('y')];
    expect(lire([...memes].reverse()).lignes).toEqual(lire(memes).lignes);
    expect(lire(memes).lignes).toHaveLength(4);
    // Contenu différent : l'ordre d'entrée est conservé (tri stable).
    expect(numeros(lire([sansNumero('x', 100), sansNumero('y', 200)]))).toEqual(['', '', '', '']);
    expect(lire([sansNumero('x', 100), sansNumero('y', 200)]).lignes[0]).toContain('|1,00|');
    expect(lire([sansNumero('y', 200), sansNumero('x', 100)]).lignes[0]).toContain('|2,00|');
    // Même date : l'absent passe avant un numéro présent, quel que soit l'ordre d'entrée.
    const present = ecr('m', 'AC-1', 'AC', 'valide');
    const attendu = ['', '', 'AC-1', 'AC-1'];
    expect(numeros(lire([sansNumero('x'), present]))).toEqual(attendu);
    expect(numeros(lire([present, sansNumero('x')]))).toEqual(attendu);
    // La date de validation prime sur le numéro absent.
    expect(numeros(lire([sansNumero('t'), present]))).toEqual(['AC-1', 'AC-1', '', '']);
    expect(numeros(lire([present, sansNumero('t')]))).toEqual(['AC-1', 'AC-1', '', '']);
    expect(numeros(lire([sansNumero('u'), present]))).toEqual(['', '', 'AC-1', 'AC-1']);
    // Le tri numérique s'applique aux numéros présents.
    const dix = ecr('y', 'AC-10', 'AC', 'valide');
    const neuf = ecr('x', 'AC-9', 'AC', 'valide');
    expect(numeros(lire([dix, neuf]))).toEqual(['AC-9', 'AC-9', 'AC-10', 'AC-10']);
    expect(numeros(lire([neuf, dix]))).toEqual(['AC-9', 'AC-9', 'AC-10', 'AC-10']);
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

  describe('pièce, lettrage et tiers', () => {
    const champs = (liste: ChampFec[]): ColonneFec[] => liste.map((champ) => ({ champ, entete: champ }));
    const cols = champs(['compAuxLib', 'pieceRef', 'pieceDate', 'ecritureLet', 'dateLet']);
    const avecTiers = (): Ecriture => {
      const e = ecr('b', 'AC-1', 'AC', 'valide');
      const [l1, l2] = e.lignes as [Ecriture['lignes'][number], Ecriture['lignes'][number]];
      return { ...e, lignes: [l1, { ...l2, auxiliaire: 'F1' }] };
    };

    it('piece-ref-et-date-de-la-piece', () => {
      const ctx: ContexteFec = { ...contexte, pieces: { b: { ref: 'FA-0042', date: '2026-01-10' } } };
      const r = lignesFec([ecr('b', 'AC-1', 'AC', 'valide')], ctx, cols, options);
      expect(r.lignes[0]).toBe('|FA-0042|20260110||\n');
      expect(r.lignes[1]).toBe('|FA-0042|20260110||\n');
      const mauvaise = { ...contexte, pieces: { b: { ref: 'X', date: '2026-02-30' } } };
      expect(code(() => lignesFec([ecr('b', 'AC-1', 'AC', 'valide')], mauvaise, cols, options))).toBe(
        'date_invalide',
      );
    });

    it('sans-piece-repli-inchange', () => {
      const e = ecr('b', 'AC-1', 'AC', 'valide');
      const attendu = '|b|20260115||\n';
      expect(lignesFec([e], contexte, cols, options).lignes[0]).toBe(attendu);
      expect(lignesFec([e], { ...contexte, pieces: {} }, cols, options).lignes[0]).toBe(attendu);
      const autre = { ...contexte, pieces: { zz: { ref: 'R', date: '2026-01-01' } } };
      expect(lignesFec([e], autre, cols, options).lignes[0]).toBe(attendu);
    });

    it('lettrage-au-moment-de-la-production', () => {
      const ctx: ContexteFec = { ...contexte, lettrages: { 'b#1': { code: 'AA', date: '2026-02-05' } } };
      const r = lignesFec([ecr('b', 'AC-1', 'AC', 'valide')], ctx, cols, options);
      expect(r.lignes[1]).toBe('|b|20260115|AA|20260205\n');
      // index hors bornes ou écriture brouillon : ignorés
      const hors: ContexteFec = {
        ...contexte,
        lettrages: { 'b#2': { code: 'ZZ', date: '2026-02-05' }, 'b#-1': { code: 'ZZ', date: '2026-02-05' }, 'd#0': { code: 'ZZ', date: '2026-02-05' } },
      };
      const brouillon = ecr('d', 'AC-9', 'AC', 'brouillon');
      const rh = lignesFec([ecr('b', 'AC-1', 'AC', 'valide'), brouillon], hors, cols, options);
      expect(rh.lignes).toEqual(['|b|20260115||\n', '|b|20260115||\n']);
      // date de lettrage mal formée ; code contenant le séparateur
      const mal = { ...contexte, lettrages: { 'b#0': { code: 'AA', date: 'NaN' } } };
      expect(code(() => lignesFec([ecr('b', 'AC-1', 'AC', 'valide')], mal, cols, options))).toBe('date_invalide');
      const sep = { ...contexte, lettrages: { 'b#0': { code: 'A|A', date: '2026-02-05' } } };
      expect(code(() => lignesFec([ecr('b', 'AC-1', 'AC', 'valide')], sep, cols, options))).toBe('valeur_invalide');
    });

    it('ligne-non-lettree-vide', () => {
      const ctx: ContexteFec = { ...contexte, lettrages: { 'b#0': { code: 'AA', date: '2026-02-05' } } };
      const r = lignesFec([ecr('b', 'AC-1', 'AC', 'valide')], ctx, cols, options);
      expect(r.lignes[0]).toBe('|b|20260115|AA|20260205\n');
      expect(r.lignes[1]).toBe('|b|20260115||\n');
    });

    it('nom-du-tiers-prioritaire', () => {
      const c = champs(['compAuxLib']);
      const ctx: ContexteFec = {
        ...contexte,
        libellesComptes: { ...contexte.libellesComptes, F1: 'Compte repli' },
        libellesTiers: { F1: 'Tiers fictif SARL' },
      };
      expect(lignesFec([avecTiers()], ctx, c, options).lignes[1]).toBe('Tiers fictif SARL\n');
      const sansTiers = { ...ctx, libellesTiers: {} };
      expect(lignesFec([avecTiers()], sansTiers, c, options).lignes[1]).toBe('Compte repli\n');
      expect(lignesFec([avecTiers()], { ...sansTiers, libellesComptes: {} }, c, options).lignes[1]).toBe('F1\n');
      expect(lignesFec([avecTiers()], ctx, c, options).lignes[0]).toBe('\n');
    });

    it('piece-ref-vide-refusee', () => {
      for (const ref of ['', ' ', '   ']) {
        const ctx: ContexteFec = { ...contexte, pieces: { b: { ref, date: '2026-01-10' } } };
        expect(code(() => lignesFec([ecr('b', 'AC-1', 'AC', 'valide')], ctx, cols, options))).toBe(
          'valeur_invalide',
        );
      }
    });
  });
});
