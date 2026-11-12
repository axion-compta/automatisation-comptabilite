import { unzipSync, strFromU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { empreinteSha256 } from '../../../../../packages/noyau/src/documents/empreinte.js';
import { ErreurExploitation } from '../../../../../packages/noyau/src/exploitation/types.js';
import type { PartieFaite } from '../../../../../packages/noyau/src/export-complet/parties.js';
import { NOM_MANIFESTE } from '../../../../../packages/noyau/src/export-complet/zip-partie.js';
import { exporterExercice, type DepotExercice, type FichierExercice, type SourceExercice, type SuiviExercice } from '../zip-exercice.js';

const enc = (t: string): Uint8Array => new TextEncoder().encode(t);
const contenu = (f: { rayon: string; exerciceId: string; chemin: string }): string => `fictif ${f.exerciceId} ${f.rayon} ${f.chemin}`;

function fichiers(): FichierExercice[] {
  const l: FichierExercice[] = [];
  const ajouter = (exerciceId: string, rayon: string, chemin: string): number => l.push({ exerciceId, rayon, chemin, taille: enc(contenu({ exerciceId, rayon, chemin })).length });
  for (let i = 0; i < 100; i++) {
    ajouter('ex-2026', 'pieces', `pieces/2026/piece-${String(i).padStart(3, '0')}.pdf`);
    ajouter('ex-2026', 'ecritures', `ecritures/2026/ecr-${String(i).padStart(3, '0')}.txt`);
  }
  ajouter('ex-2026', 'declarations', 'declarations/2026/tva-01.txt'); ajouter('ex-2025', 'pieces', 'pieces/2025/ancienne.pdf');
  return l;
}
function creerSource(tous = fichiers()): SourceExercice {
  return { lister: async () => tous, lire: async (c) => enc(((f) => (f === undefined ? '' : contenu(f)))(tous.find((x) => x.chemin === c))) };
}
function creerDepot(): DepotExercice & { objets: Map<string, Uint8Array>; depots: string[]; panneSur: string | null } {
  const d = {
    objets: new Map<string, Uint8Array>(), depots: [] as string[], panneSur: null as string | null,
    deposer: async (cle: string, octets: Uint8Array): Promise<void> => {
      if (d.panneSur !== null && cle.endsWith(d.panneSur)) throw new Error('panne fictive du depot');
      d.objets.set(cle, octets); d.depots.push(cle);
    }, lire: async (cle: string): Promise<Uint8Array | undefined> => d.objets.get(cle),
  };
  return d;
}
function creerSuivi(): SuiviExercice & { notees: PartieFaite[]; ids: string[] } {
  const parId = new Map<string, PartieFaite[]>();
  const s: SuiviExercice & { notees: PartieFaite[]; ids: string[] } = {
    notees: [], ids: [], faites: async (id) => (s.ids.push(id), [...(parId.get(id) ?? [])]),
    noter: async (id, p) => { s.notees.push(p); parId.set(id, [...(parId.get(id) ?? []), p]); },
  };
  return s;
}
function cheminsDuDepot(depot: { objets: Map<string, Uint8Array> }): string[] {
  return [...depot.objets].filter(([c]) => c.endsWith('.zip')).flatMap(([, o]) => Object.keys(unzipSync(o))).filter((n) => n !== NOM_MANIFESTE).sort();
}
const code = (o: Parameters<typeof exporterExercice>[0]): Promise<string | undefined> =>
  exporterExercice(o).then(() => undefined, (e: unknown) => (e instanceof ErreurExploitation ? e.code : 'autre'));
const base = (rayons: string[], tailleMax = 2000) => ({ exerciceId: 'ex-2026', rayons, tailleMax });
const nomsZip = (depot: { depots: string[] }): (string | undefined)[] => depot.depots.filter((c) => c.endsWith('.zip')).map((c) => c.split('/').pop());
const lancerSimple = async (rayons: string[]): Promise<ReturnType<typeof creerDepot>> => {
  const depot = creerDepot();
  return exporterExercice({ ...base(rayons), source: creerSource(), depot, suivi: creerSuivi() }).then(() => depot);
};

describe('zip d’un exercice', () => {
  it('deux-cents-fichiers-manifeste-verifie', async () => {
    const depot = creerDepot();
    const r = await exporterExercice({ ...base(['pieces', 'ecritures']), source: creerSource(), depot, suivi: creerSuivi() });
    expect(r.parties.length).toBeGreaterThan(3);
    expect([new Set(cheminsDuDepot(depot)).size, cheminsDuDepot(depot).length]).toEqual([200, 200]);
    for (const [cle, octets] of [...depot.objets].filter(([c]) => c.endsWith('.zip'))) {
      const contenuZip = unzipSync(octets);
      const manifeste = strFromU8(contenuZip[NOM_MANIFESTE] ?? new Uint8Array());
      for (const [nom, o] of Object.entries(contenuZip)) {
        if (nom !== NOM_MANIFESTE) expect(manifeste).toContain(`${empreinteSha256(o)}  ${nom}\n`);
      }
      expect(r.parties.find((p) => cle.endsWith(p.nom))?.empreinte).toBe(empreinteSha256(octets));
    }
    const global = strFromU8([...depot.objets].find(([c]) => c.endsWith('manifeste-global.sha256'))?.[1] ?? new Uint8Array());
    expect(global.split('\n').filter((l) => l !== '').length).toBe(r.parties.length);
    expect(r.manifesteEmpreinte).toBe(empreinteSha256(global));
  });
  it('interruption-puis-reprise-sans-doublon', async () => {
    const source = creerSource();
    const reference = await exporterExercice({ ...base(['pieces']), source, depot: creerDepot(), suivi: creerSuivi() });
    const noms = reference.parties.map((p) => p.nom);
    const [depot, suivi] = [creerDepot(), creerSuivi()];
    depot.panneSur = noms[2] ?? '';
    await expect(exporterExercice({ ...base(['pieces']), source, depot, suivi })).rejects.toThrow('panne fictive');
    expect(suivi.notees.length).toBe(2);
    depot.panneSur = null; depot.depots.length = 0;
    const reprise = await exporterExercice({ ...base(['pieces']), source, depot, suivi });
    expect(nomsZip(depot)).toEqual(noms.slice(2));
    expect(reprise.manifesteEmpreinte).toBe(reference.manifesteEmpreinte);
    expect(cheminsDuDepot(depot).length).toBe(100);
    depot.objets.set([...depot.objets.keys()].find((c) => c.endsWith(noms[0] ?? '')) ?? '', enc('octets alteres'));
    depot.depots.length = 0;
    await exporterExercice({ ...base(['pieces']), source, depot, suivi });
    expect(nomsZip(depot)).toEqual([noms[0]]);
  });
  it('un-seul-rayon', async () => {
    expect(cheminsDuDepot(await lancerSimple(['declarations']))).toEqual(['declarations/2026/tva-01.txt']);
  });
  it('deux-rayons', async () => {
    const chemins = cheminsDuDepot(await lancerSimple(['declarations', 'ecritures']));
    expect(chemins.length).toBe(101);
    expect(['pieces/', 'declarations/', 'ecritures/'].map((r) => chemins.some((c) => c.startsWith(r)))).toEqual([false, true, true]);
  });
  it('autre-exercice-exclu', async () => {
    expect(cheminsDuDepot(await lancerSimple(['pieces']))).toEqual(fichiers().filter((f) => f.exerciceId === 'ex-2026' && f.rayon === 'pieces').map((f) => f.chemin).sort());
  });
  it('contenu-change-de-meme-taille-refait', async () => {
    const source = creerSource();
    const [depot, suivi, lire] = [creerDepot(), creerSuivi(), source.lire];
    await exporterExercice({ ...base(['declarations']), source, depot, suivi });
    const taille = (await lire('declarations/2026/tva-01.txt')).length;
    source.lire = async (c) => (c === 'declarations/2026/tva-01.txt' ? enc('x'.repeat(taille)) : lire(c)); depot.depots.length = 0;
    await exporterExercice({ ...base(['declarations']), source, depot, suivi });
    expect(nomsZip(depot).length).toBe(1);
    expect([...depot.objets].filter(([c]) => c.endsWith('.zip')).some(([, o]) => strFromU8(unzipSync(o)['declarations/2026/tva-01.txt'] ?? new Uint8Array()) === 'x'.repeat(taille))).toBe(true);
    expect(suivi.ids[0]).not.toBe(suivi.ids[1]);
  });
  it('signature-du-suivi-depend-des-rayons-et-du-plan', async () => {
    const [source, suivi] = [creerSource(), creerSuivi()];
    const lancer = (rayons: string[], tailleMax?: number) => exporterExercice({ ...base(rayons, tailleMax), source, depot: creerDepot(), suivi });
    await lancer(['declarations']);
    await lancer(['declarations', 'vide']); // même plan, rayons différents
    await lancer(['pieces'], 2000);
    await lancer(['pieces'], 3000); // mêmes rayons, découpe différente
    await lancer(['pieces'], 3000);
    const [a, b, c, d, e] = suivi.ids;
    expect([a !== b, c !== d, d === e]).toEqual([true, true, true]);
  });
  it('controle-final-echoue-si-le-depot-altere-ou-perd-une-partie-ou-le-manifeste', async () => {
    const lancer = (cible: string | null, perdre = false): Promise<string | undefined> => {
      const depot = creerDepot();
      const deposer = depot.deposer;
      depot.deposer = async (cle, octets) => deposer(cle, cible !== null && cle.endsWith(cible) ? enc('octets alteres') : octets);
      if (perdre) depot.lire = async (cle) => (cible !== null && cle.endsWith(cible) ? undefined : depot.objets.get(cle));
      return code({ ...base(['declarations']), source: creerSource(), depot, suivi: creerSuivi() });
    };
    expect(await lancer(null)).toBeUndefined();
    for (const cible of ['.zip', 'manifeste-global.sha256']) {
      expect(await lancer(cible)).toBe('controle_absent');
      expect(await lancer(cible, true)).toBe('controle_absent');
    }
  });
  it('refuse les entrées invalides', async () => {
    const [source, depot, suivi] = [creerSource(), creerDepot(), creerSuivi()];
    const c = (o: object) => code({ ...base(['pieces']), source, depot, suivi, ...o });
    expect([await c({ rayons: [] }), await c({ rayons: ['../x'] }), await c({ exerciceId: 'a/b' })]).toEqual(Array(3).fill('chemin_invalide'));
    expect([await c({ tailleMax: 0 }), await c({ tailleMax: Number.NaN }), await c({ tailleMax: -5 })]).toEqual(Array(3).fill('taille_invalide'));
    expect(depot.depots).toEqual([]);
  });
});
