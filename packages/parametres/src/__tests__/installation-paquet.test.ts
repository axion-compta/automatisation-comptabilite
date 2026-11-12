import { generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ParametreLegal } from '../au-jour.js';
import type { PaquetParametres } from '../paquet.js';
import { installerPaquetHorsLigne, lireFichierPaquet } from '../installation-paquet.js';
import { octetsASigner, type CleSignature } from '../signature-paquet.js';

// Paires de clés générées ici, jamais écrites dans le dépôt. Valeurs de paramètres INVENTÉES.
function paire(id: string, revoquee = false) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return { cle: { id, publique: publicKey.export({ type: 'spki', format: 'pem' }).toString(), revoquee } as CleSignature, privee: privateKey };
}
const ligne = (sur: Partial<ParametreLegal> = {}): ParametreLegal => ({
  cle: 'fictif.taux_a',
  pays: 'XX',
  valeur: '2000',
  effet_debut: '2026-01-01',
  effet_fin: null,
  statut: 'a_verifier',
  source: 'source fictive',
  date_releve: '2026-01-01',
  ...sur,
});
const paquet = (version: string, lignes: ParametreLegal[] = [ligne()]): PaquetParametres => ({ version, lignes });
const fichier = (k: ReturnType<typeof paire>, p: PaquetParametres, sur: Record<string, unknown> = {}): Uint8Array => {
  const contenu = {
    paquet: p,
    version: p.version,
    dateEffet: '2026-03-01',
    cleId: k.cle.id,
    signature: sign(null, octetsASigner(p), k.privee).toString('base64'),
    ...sur,
  };
  return new TextEncoder().encode(JSON.stringify(contenu));
};
const texte = (o: Uint8Array) => new TextDecoder().decode(o);
const octets = (s: string) => new TextEncoder().encode(s);

afterEach(() => vi.unstubAllGlobals());

describe('installation hors ligne du paquet légal', () => {
  const k = paire('cle-1');
  const cles = [k.cle];

  it('fichier-unique-installe-sans-reseau', () => {
    const appel = vi.fn(() => Promise.reject(new Error('reseau_interdit')));
    vi.stubGlobal('fetch', appel);
    const lu = lireFichierPaquet(fichier(k, paquet('v2')));
    expect(lu).toMatchObject({ version: 'v2', dateEffet: '2026-03-01', cleId: 'cle-1' });
    expect(installerPaquetHorsLigne(fichier(k, paquet('v2')), cles, 'v1')).toEqual({ installe: true, version: 'v2', dateEffet: '2026-03-01' });
    expect(installerPaquetHorsLigne(fichier(k, paquet('v1')), cles, null)).toEqual({ installe: true, version: 'v1', dateEffet: '2026-03-01' });
    expect(appel).not.toHaveBeenCalled();
  });

  it('octet-modifie-refuse', () => {
    const modifie = octets(texte(fichier(k, paquet('v2'))).replace('"2000"', '"2001"'));
    expect(installerPaquetHorsLigne(modifie, cles, 'v1')).toMatchObject({
      installe: false,
      code: 'signature_invalide',
      journal: { evenement: 'parametres.paquet_refuse', code: 'signature_invalide', version: 'v2' },
    });
    // La version du dessus doit rester celle du paquet signé.
    const autreVersion = fichier(k, paquet('v2'), { version: 'v9' });
    expect(installerPaquetHorsLigne(autreVersion, cles, 'v1')).toMatchObject({ installe: false, code: 'fichier_illisible' });
  });

  it('fichier-illisible-refuse', () => {
    const bon = JSON.parse(texte(fichier(k, paquet('v2')))) as Record<string, unknown>;
    const invalideUtf8 = Buffer.from(JSON.stringify(bon)); // JSON valide dont la valeur de `source` contient un octet UTF-8 invalide
    invalideUtf8[invalideUtf8.indexOf('"source":"') + 10] = 0xff;
    const sans = (champ: string) => octets(JSON.stringify({ ...bon, [champ]: undefined }));
    const cas: Uint8Array[] = [
      ...['', 'pas du json', '[]', 'null', '"texte"'].map(octets),
      new Uint8Array([0xff, 0xfe, 0x00]),
      ...[{ cleId: '' }, { signature: '' }].map((vide) => octets(JSON.stringify({ ...bon, ...vide }))),
      invalideUtf8,
      ...['paquet', 'version', 'dateEffet', 'cleId', 'signature'].map(sans),
      octets(JSON.stringify({ ...bon, paquet: { version: 'v2' } })),
      octets(JSON.stringify({ ...bon, paquet: { version: 'v2', lignes: [42] } })),
      octets(JSON.stringify({ ...bon, signature: 12 })),
      octets(JSON.stringify({ ...bon, version: '' })),
    ];
    for (const c of cas) {
      expect(lireFichierPaquet(c)).toEqual({ refus: 'fichier_illisible' });
      expect(installerPaquetHorsLigne(c, cles, 'v1')).toEqual({
        installe: false,
        code: 'fichier_illisible',
        journal: { evenement: 'parametres.paquet_refuse', code: 'fichier_illisible', version: '' },
      });
    }
  });

  it('date-effet-invalide-refusee', () => {
    for (const d of ['2026-02-30', '2026-13-01', '2026-00-10', '2026-04-31', '01/03/2026', '2026-3-1', '', 'demain', '2026-03-01T00:00:00Z', 20260301]) {
      expect(installerPaquetHorsLigne(fichier(k, paquet('v2'), { dateEffet: d }), cles, 'v1'), String(d)).toMatchObject({
        installe: false,
        code: 'fichier_illisible',
      });
    }
    expect(installerPaquetHorsLigne(fichier(k, paquet('v2'), { dateEffet: '2028-02-29' }), cles, 'v1')).toMatchObject({ installe: true });
    expect(installerPaquetHorsLigne(fichier(k, paquet('v2'), { dateEffet: '2027-02-29' }), cles, 'v1')).toMatchObject({ installe: false });
  });

  it('version-inferieure-refusee-et-journalisee', () => {
    for (const installee of ['v3', 'v2']) {
      expect(installerPaquetHorsLigne(fichier(k, paquet('v2')), cles, installee)).toEqual({
        installe: false,
        code: 'retour_arriere',
        journal: { evenement: 'parametres.paquet_refuse', code: 'retour_arriere', version: 'v2' },
      });
    }
    // Ordre naturel : v10 suit v9.
    expect(installerPaquetHorsLigne(fichier(k, paquet('v10')), cles, 'v9')).toMatchObject({ installe: true });
    // Une ligne sans source est refusée par la vérification, pas par la lecture.
    expect(installerPaquetHorsLigne(fichier(k, paquet('v2', [ligne({ source: '' })])), cles, 'v1')).toMatchObject({
      installe: false,
      code: 'ligne_sans_source',
    });
  });

  it('exercice-rotation', () => {
    const ancienne = paire('cle-ancienne');
    const nouvelle = paire('cle-nouvelle');
    // Avant la rotation : seule l'ancienne clé signe.
    const avant = [ancienne.cle];
    expect(installerPaquetHorsLigne(fichier(ancienne, paquet('v2')), avant, 'v1')).toMatchObject({ installe: true });
    expect(installerPaquetHorsLigne(fichier(nouvelle, paquet('v3')), avant, 'v2')).toMatchObject({ installe: false, code: 'cle_inconnue' });
    // Rotation : la nouvelle clé est ajoutée, l'ancienne révoquée.
    const apres = [{ ...ancienne.cle, revoquee: true }, nouvelle.cle];
    expect(installerPaquetHorsLigne(fichier(nouvelle, paquet('v3')), apres, 'v2')).toMatchObject({ installe: true, version: 'v3' });
    const refuse = installerPaquetHorsLigne(fichier(ancienne, paquet('v4')), apres, 'v3');
    expect(refuse).toEqual({
      installe: false,
      code: 'cle_revoquee',
      journal: { evenement: 'parametres.paquet_refuse', code: 'cle_revoquee', version: 'v4' },
    });
  });

  it('aucun-import-reseau', () => {
    const source = readFileSync(new URL('../installation-paquet.ts', import.meta.url), 'utf8');
    for (const interdit of ['node:http', 'node:https', 'node:net', 'node:dgram', 'node:tls', 'fetch', 'XMLHttpRequest', 'WebSocket']) {
      expect(source.includes(interdit), interdit).toBe(false);
    }
    expect(source).toContain('verifierPaquetSigne');
    expect(source).not.toContain('\0');
  });
});
