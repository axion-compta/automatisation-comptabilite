import { describe, expect, it } from 'vitest';
import { TYPES_USAGE, enregistrer, pseudonyme, validerEvenements } from '../usage.js';

// Secret inventé, visiblement fictif (plus de 32 octets).
const secret = ['secret-fictif', '0123456789', 'abcdefghijklmnop'].join('-');
const secretB = ['autre-secret-fictif', '9876543210', 'zyxwvutsrq'].join('-');
const max = 1_800_000;

function un(evenement: unknown) {
  return validerEvenements([evenement], { dureeMaxMs: max });
}

describe('usage : mesure sans contenu', () => {
  it('six-champs-acceptes', () => {
    const e = {
      type: 'ecran_ouvert',
      ecran_code: 'tb01',
      duree_ms: 1200,
      appareil: 'mobile',
      version_app: '1.2.3',
      horodatage: 1_700_000_000,
    };
    const r = un(e);
    expect(r.rejetes).toEqual([]);
    expect(r.acceptes).toEqual([e]);
    // seul le type est obligatoire
    expect(un({ type: 'palette_ouverte' }).acceptes).toEqual([{ type: 'palette_ouverte' }]);
    expect(un({ type: 'palette_ouverte', appareil: 'bureau' }).rejetes).toEqual([]);
    expect(un({ type: 'palette_ouverte', appareil: 'tablette' }).rejetes).toEqual([{ index: 0, code: 'valeur_invalide' }]);
    // la liste des types est gelée, au plus 30 codes
    expect(Object.isFrozen(TYPES_USAGE)).toBe(true);
    expect(TYPES_USAGE.length).toBeLessThanOrEqual(30);
    expect(new Set(TYPES_USAGE).size).toBe(TYPES_USAGE.length);
    for (const t of ['ecran_ouvert', 'carte_ouverte', 'carte_resolue', 'export_lance', 'recherche_lancee', 'preference_modifiee', 'raccourci_utilise', 'palette_ouverte']) {
      expect(TYPES_USAGE).toContain(t);
    }
    // forme des codes et des versions
    expect(un({ type: 'ecran_ouvert', ecran_code: 'a1' }).rejetes).toEqual([]);
    expect(un({ type: 'ecran_ouvert', ecran_code: 'abcdef' }).rejetes).toEqual([]);
    for (const c of ['a', 'abcdefg', 'A1', '1ab', 'a-b', 'a b', '', 5]) {
      expect(un({ type: 'ecran_ouvert', ecran_code: c }).rejetes).toEqual([{ index: 0, code: 'valeur_invalide' }]);
    }
    for (const v of ['1.2', '1.2.3.4', 'v1.2.3', '1.2.x', '', ' 1.2.3', '1.2.3\n', 123]) {
      expect(un({ type: 'ecran_ouvert', version_app: v }).rejetes).toEqual([{ index: 0, code: 'valeur_invalide' }]);
    }
    expect(un({ type: 'ecran_ouvert', version_app: '10.20.30' }).rejetes).toEqual([]);
  });

  it('champ-en-trop-rejete', () => {
    for (const champ of ['texte', 'montant', 'ip', 'email', 'pieceId', 'nom', 'iban', 'agent_utilisateur', 'personne_id', '__proto__']) {
      const e = JSON.parse(`{"type":"ecran_ouvert","${champ}":"x"}`) as unknown;
      const r = un(e);
      expect(r.acceptes).toEqual([]);
      expect(r.rejetes).toEqual([{ index: 0, code: 'champ_inconnu' }]);
    }
    // un événement bon et un mauvais : index conservés
    const r = validerEvenements([{ type: 'ecran_ouvert' }, { type: 'ecran_ouvert', texte: 'x' }, { type: 'export_lance' }], { dureeMaxMs: max });
    expect(r.acceptes).toEqual([{ type: 'ecran_ouvert' }, { type: 'export_lance' }]);
    expect(r.rejetes).toEqual([{ index: 1, code: 'champ_inconnu' }]);
    // pas un objet
    for (const x of [null, 'ecran_ouvert', 5, ['type'], undefined]) {
      expect(un(x).rejetes).toEqual([{ index: 0, code: 'valeur_invalide' }]);
      expect(un(x).acceptes).toEqual([]);
    }
    expect(validerEvenements([], { dureeMaxMs: max })).toEqual({ acceptes: [], rejetes: [] });
    // le champ en trop prime sur un type inconnu
    expect(un({ type: 'zzz', ip: 'x' }).rejetes).toEqual([{ index: 0, code: 'champ_inconnu' }]);
  });

  it('type-inconnu-rejete', () => {
    for (const t of ['inconnu', '', 'ECRAN_OUVERT', ' ecran_ouvert', 5, null, undefined]) {
      expect(un({ type: t }).rejetes).toEqual([{ index: 0, code: 'type_inconnu' }]);
    }
    expect(un({}).rejetes).toEqual([{ index: 0, code: 'type_inconnu' }]);
    expect(un({ ecran_code: 'tb01' }).rejetes).toEqual([{ index: 0, code: 'type_inconnu' }]);
    expect(un({ type: 'toString' }).rejetes).toEqual([{ index: 0, code: 'type_inconnu' }]);
  });

  it('duree-ramenee-au-maximum', () => {
    expect(un({ type: 'ecran_ouvert', duree_ms: 5_000_000 }).acceptes).toEqual([{ type: 'ecran_ouvert', duree_ms: max }]);
    expect(un({ type: 'ecran_ouvert', duree_ms: max }).acceptes).toEqual([{ type: 'ecran_ouvert', duree_ms: max }]);
    expect(un({ type: 'ecran_ouvert', duree_ms: max - 1 }).acceptes).toEqual([{ type: 'ecran_ouvert', duree_ms: max - 1 }]);
    expect(un({ type: 'ecran_ouvert', duree_ms: max + 1 }).acceptes).toEqual([{ type: 'ecran_ouvert', duree_ms: max }]);
    expect(un({ type: 'ecran_ouvert', duree_ms: 0 }).acceptes).toEqual([{ type: 'ecran_ouvert', duree_ms: 0 }]);
    expect(un({ type: 'ecran_ouvert' }).acceptes).toEqual([{ type: 'ecran_ouvert' }]);
    expect(validerEvenements([{ type: 'ecran_ouvert', duree_ms: 500 }], { dureeMaxMs: 100 }).acceptes[0]).toEqual({
      type: 'ecran_ouvert',
      duree_ms: 100,
    });
    for (const m of [0, -1, 1.5, NaN, Infinity]) {
      expect(() => validerEvenements([], { dureeMaxMs: m })).toThrow();
    }
  });

  it('duree-invalide-rejetee', () => {
    for (const d of [-1, 1.5, NaN, Infinity, -Infinity, '10', null, true, [10]]) {
      const r = un({ type: 'ecran_ouvert', duree_ms: d });
      expect(r.acceptes).toEqual([]);
      expect(r.rejetes).toEqual([{ index: 0, code: 'valeur_invalide' }]);
    }
  });

  it('horodatage-en-secondes-seulement', () => {
    expect(un({ type: 'ecran_ouvert', horodatage: 0 }).rejetes).toEqual([]);
    expect(un({ type: 'ecran_ouvert', horodatage: 99_999_999_999 }).rejetes).toEqual([]);
    expect(un({ type: 'ecran_ouvert', horodatage: 100_000_000_000 }).rejetes).toEqual([{ index: 0, code: 'valeur_invalide' }]);
    // millisecondes : refusé
    expect(un({ type: 'ecran_ouvert', horodatage: 1_700_000_000_000 }).rejetes).toEqual([{ index: 0, code: 'valeur_invalide' }]);
    for (const h of [-1, 1.5, NaN, Infinity, '1700000000', null, true]) {
      expect(un({ type: 'ecran_ouvert', horodatage: h }).rejetes).toEqual([{ index: 0, code: 'valeur_invalide' }]);
    }
  });

  it('pseudonyme-stable-et-different-par-secret', () => {
    const a = pseudonyme('personne-fictive-1', secret);
    expect(a).toBe('565a0f1c6889aec855e85b115e21fcef32bb15aca86bec9ea89743d22b7b9292');
    expect(pseudonyme('personne-fictive-1', secret)).toBe(a);
    expect(pseudonyme('personne-fictive-1', secretB)).not.toBe(a);
    expect(pseudonyme('personne-fictive-2', secret)).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain('personne');
    expect(() => pseudonyme('', secret)).toThrow();
  });

  it('secret-trop-court-refuse', () => {
    expect(() => pseudonyme('personne-fictive-1', '')).toThrow();
    expect(() => pseudonyme('personne-fictive-1', 'court')).toThrow();
    expect(() => pseudonyme('personne-fictive-1', 'x'.repeat(31))).toThrow();
    expect(() => pseudonyme('personne-fictive-1', 'x'.repeat(32))).not.toThrow();
    // 31 caractères mais 32 octets : accepté (comptage en octets)
    expect(() => pseudonyme('personne-fictive-1', 'é' + 'x'.repeat(30))).not.toThrow();
    expect(() => pseudonyme('personne-fictive-1', undefined as unknown as string)).toThrow();
  });

  it('desactivee-rien-ecrit', () => {
    const evenements = [{ type: 'ecran_ouvert' }, { type: 'export_lance' }];
    expect(enregistrer(evenements, { mesure: 'desactivee' })).toEqual([]);
    expect(enregistrer(evenements, { mesure: 'active' })).toEqual(evenements);
    expect(enregistrer([], { mesure: 'active' })).toEqual([]);
    // valeur inattendue : rien n'est écrit
    expect(enregistrer(evenements, { mesure: 'oui' as unknown as 'active' })).toEqual([]);
    expect(enregistrer(evenements, {} as unknown as { mesure: 'active' })).toEqual([]);
  });

  it('installation-l-emporte', () => {
    const evenements = [{ type: 'ecran_ouvert' }];
    expect(enregistrer(evenements, { mesure: 'active', reglageInstallation: 'desactivee' })).toEqual([]);
    expect(enregistrer(evenements, { mesure: 'desactivee', reglageInstallation: 'desactivee' })).toEqual([]);
    expect(enregistrer(evenements, { mesure: 'active' })).toEqual(evenements);
  });
});
