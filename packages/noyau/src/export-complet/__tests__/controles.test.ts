import { describe, expect, it } from 'vitest';
import { empreinteSha256, manifeste } from '../../documents/empreinte.js';
import type { ResultatControle } from '../../exploitation/restauration-controles.js';
import { ErreurExploitation } from '../../exploitation/types.js';
import { controleFec, controleGrandLivre, controleManifeste, controleNombrePieces, deciderRemise } from '../controles.js';

function code(action: () => unknown): string | undefined {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurExploitation ? e.code : 'autre';
  }
  return undefined;
}

const EXOS = ['2025', '2026'];
const FICHIERS = [{ nom: 'a.csv', octets: 'un' }, { nom: 'b.csv', octets: 'deux' }];
const CLIENT = 'cli-demo1';
const LE = '2026-11-07T10:00:00Z';
const vert = (): ResultatControle[] => [
  ...controleFec(EXOS.map((exercice) => ({ exercice, ok: true })), EXOS),
  controleNombrePieces([{ pieceId: 'p1' }, { pieceId: 'p2' }], 2),
  controleManifeste(manifeste(FICHIERS), FICHIERS),
  ...controleGrandLivre([{ exercice: '2026', debit: 100, credit: 40 }, { exercice: '2026', debit: 0, credit: 60 }]),
];
const resultat = (c: ResultatControle[], id: string): string | undefined => c.find((x) => x.id === id)?.resultat;

describe('controles avant remise de l export complet', () => {
  it('tout-vert-remise-permise', () => {
    expect(deciderRemise(vert(), CLIENT, LE)).toEqual({ remise: 'permise', alerte: null });
    expect(code(() => deciderRemise([], CLIENT, LE))).toBe('controle_absent');
  });

  it('fec-manquant-impossible-bloque', () => {
    const c = controleFec([{ exercice: '2025', ok: true }], EXOS);
    expect(c.map((x) => [x.id, x.resultat])).toEqual([['fec:2025', 'OK'], ['fec:2026', 'IMPOSSIBLE']]);
    expect(controleFec(null, EXOS).every((x) => x.resultat === 'IMPOSSIBLE')).toBe(true);
    expect(controleFec([{ exercice: '2025', ok: false }, { exercice: '2026', ok: true }], EXOS)[0]?.resultat).toBe('ECHEC');
    expect(code(() => controleFec([{ exercice: '2024', ok: true }], EXOS))).toBe('ordre_invalide');
    expect(code(() => controleFec([{ exercice: '2025', ok: true }, { exercice: '2025', ok: true }], EXOS))).toBe('doublon');
    const r = deciderRemise([...vert().filter((x) => !x.id.startsWith('fec:')), ...c], CLIENT, LE);
    expect(r.remise).toBe('bloquee');
    expect(r.alerte).toEqual({ code: 'export_bloque', clientRef: CLIENT, horodatage: LE });
  });

  it('pieces-index-dedoublonnees', () => {
    const lignes = [{ pieceId: 'p1' }, { pieceId: 'p1' }, { pieceId: 'p2' }];
    expect(controleNombrePieces(lignes, 2).resultat).toBe('OK');
    expect(controleNombrePieces(lignes, 3).resultat).toBe('ECHEC');
    expect(controleNombrePieces([], 0).resultat).toBe('OK');
  });

  it('nombre-de-pieces-different-bloque', () => {
    const c = controleNombrePieces([{ pieceId: 'p1' }], 2);
    expect(c).toEqual({ id: 'pieces', resultat: 'ECHEC', attendu: '2', obtenu: '1' });
    expect(deciderRemise([c], CLIENT, LE).remise).toBe('bloquee');
    for (const n of [Number.NaN, Infinity, 1.5, -1]) expect(controleNombrePieces([], n).resultat).toBe('IMPOSSIBLE');
  });

  it('fichier-modifie-bloque', () => {
    const texte = manifeste(FICHIERS);
    expect(controleManifeste(texte, FICHIERS).resultat).toBe('OK');
    const modifie = controleManifeste(texte, [FICHIERS[0]!, { nom: 'b.csv', octets: 'autre' }]);
    expect(modifie).toMatchObject({ resultat: 'ECHEC', obtenu: 'manquants=0;modifies=1;en_trop=0' });
    expect(controleManifeste(texte, [FICHIERS[0]!]).resultat).toBe('ECHEC');
    expect(controleManifeste(texte, [...FICHIERS, { nom: 'c.csv', octets: 'x' }]).obtenu).toBe('manquants=0;modifies=0;en_trop=1');
    expect(controleManifeste(null, FICHIERS).resultat).toBe('IMPOSSIBLE');
    expect(deciderRemise([modifie], null, LE)).toMatchObject({ remise: 'bloquee', alerte: { clientRef: null } });
  });

  it('manifeste-illisible-echec', () => {
    for (const texte of ['n importe quoi\n', `${'z'.repeat(64)}  a.csv\n`, `${empreinteSha256('un')}  a.csv\n${empreinteSha256('un')}  a.csv\n`]) {
      expect(controleManifeste(texte, FICHIERS)).toMatchObject({ resultat: 'ECHEC', attendu: 'manifeste_lisible' });
    }
  });

  it('grand-livre-desequilibre-bloque', () => {
    const c = controleGrandLivre([{ exercice: '2026', debit: 100, credit: 99 }, { exercice: '2025', debit: 5, credit: 5 }]);
    expect(c.map((x) => x.id)).toEqual(['grand_livre:2025', 'grand_livre:2026']);
    expect(c[0]?.resultat).toBe('OK');
    expect(c[1]).toEqual({ id: 'grand_livre:2026', resultat: 'ECHEC', attendu: 'debit=credit', obtenu: 'debit=100;credit=99' });
    expect(deciderRemise(c, CLIENT, LE).remise).toBe('bloquee');
    expect(controleGrandLivre([])).toEqual([]);
  });

  it('montant-invalide-impossible', () => {
    const ok = { exercice: '2025', debit: 1, credit: 1 };
    for (const m of [1.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(resultat(controleGrandLivre([ok, { exercice: '2026', debit: m, credit: 1 }]), 'grand_livre:2026')).toBe('IMPOSSIBLE');
      expect(resultat(controleGrandLivre([{ exercice: '2026', debit: 1, credit: m }]), 'grand_livre:2026')).toBe('IMPOSSIBLE');
    }
    const somme = controleGrandLivre([
      { exercice: '2026', debit: Number.MAX_SAFE_INTEGER, credit: Number.MAX_SAFE_INTEGER },
      { exercice: '2026', debit: 1, credit: 1 },
      { exercice: '2025', debit: 1, credit: 1 },
    ]);
    expect(somme.map((x) => x.resultat)).toEqual(['OK', 'IMPOSSIBLE']);
    expect(deciderRemise(somme, CLIENT, LE).remise).toBe('bloquee');
  });
});
