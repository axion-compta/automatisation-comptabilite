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
  const liste: FichierExercice[] = [];
  for (let i = 0; i < 100; i++) {
    const n = String(i).padStart(3, '0');
    liste.push({ exerciceId: 'ex-2026', rayon: 'pieces', chemin: `pieces/2026/piece-${n}.pdf`, taille: 0 });
    liste.push({ exerciceId: 'ex-2026', rayon: 'ecritures', chemin: `ecritures/2026/ecr-${n}.txt`, taille: 0 });
  }
  liste.push({ exerciceId: 'ex-2026', rayon: 'declarations', chemin: 'declarations/2026/tva-01.txt', taille: 0 });
  liste.push({ exerciceId: 'ex-2025', rayon: 'pieces', chemin: 'pieces/2025/ancienne.pdf', taille: 0 });
  return liste.map((f) => ({ ...f, taille: enc(contenu(f)).length }));
}
function creerSource(tous = fichiers()): SourceExercice {
  return {
    lister: async () => tous,
    lire: async (chemin) => {
      const f = tous.find((x) => x.chemin === chemin);
      return enc(f === undefined ? '' : contenu(f));
    },
  };
}
function creerDepot(): DepotExercice & { objets: Map<string, Uint8Array>; depots: string[]; panneSur: string | null } {
  const d = {
    objets: new Map<string, Uint8Array>(), depots: [] as string[], panneSur: null as string | null,
    deposer: async (cle: string, octets: Uint8Array): Promise<void> => {
      if (d.panneSur !== null && cle.endsWith(d.panneSur)) throw new Error('panne fictive du depot');
      d.objets.set(cle, octets); d.depots.push(cle);
    },
    lire: async (cle: string): Promise<Uint8Array | undefined> => d.objets.get(cle),
  };
  return d;
}
function creerSuivi(): SuiviExercice & { notees: PartieFaite[] } {
  const s = {
    notees: [] as PartieFaite[],
    faites: async (): Promise<PartieFaite[]> => [...s.notees],
    noter: async (_id: string, p: PartieFaite): Promise<void> => {
      s.notees.push(p);
    },
  };
  return s;
}
function cheminsDuDepot(depot: { objets: Map<string, Uint8Array> }): string[] {
  const chemins: string[] = [];
  for (const [cle, octets] of depot.objets) {
    if (!cle.endsWith('.zip')) continue;
    for (const nom of Object.keys(unzipSync(octets))) if (nom !== NOM_MANIFESTE) chemins.push(nom);
  }
  return chemins.sort();
}
const base = (rayons: string[], tailleMax = 2000) => ({ exerciceId: 'ex-2026', rayons, tailleMax });

describe('zip d’un exercice', () => {
  it('deux-cents-fichiers-manifeste-verifie', async () => {
    const [depot, suivi] = [creerDepot(), creerSuivi()];
    const r = await exporterExercice({ ...base(['pieces', 'ecritures']), source: creerSource(), depot, suivi });
    expect(r.parties.length).toBeGreaterThan(3);
    const chemins = cheminsDuDepot(depot);
    expect(chemins.length).toBe(200);
    expect(new Set(chemins).size).toBe(200);
    for (const [cle, octets] of depot.objets) {
      if (!cle.endsWith('.zip')) continue;
      const contenuZip = unzipSync(octets);
      const manifeste = strFromU8(contenuZip[NOM_MANIFESTE] ?? new Uint8Array());
      for (const [nom, o] of Object.entries(contenuZip)) {
        if (nom !== NOM_MANIFESTE) expect(manifeste).toContain(`${empreinteSha256(o)}  ${nom}\n`);
      }
      const partie = r.parties.find((p) => cle.endsWith(p.nom));
      expect(partie?.empreinte).toBe(empreinteSha256(octets));
    }
    const global = strFromU8(depot.objets.get([...depot.objets.keys()].find((c) => c.endsWith('manifeste-global.sha256')) ?? '') ?? new Uint8Array());
    expect(global.split('\n').filter((l) => l !== '').length).toBe(r.parties.length);
    expect(r.manifesteEmpreinte).toBe(empreinteSha256(global));
  });

  it('interruption-puis-reprise-sans-doublon', async () => {
    const source = creerSource();
    const reference = await exporterExercice({ ...base(['pieces']), source, depot: creerDepot(), suivi: creerSuivi() });
    const [depot, suivi] = [creerDepot(), creerSuivi()];
    depot.panneSur = reference.parties[2]?.nom ?? '';
    await expect(exporterExercice({ ...base(['pieces']), source, depot, suivi })).rejects.toThrow('panne fictive');
    expect(suivi.notees.length).toBe(2);
    depot.panneSur = null;
    depot.depots.length = 0;
    const reprise = await exporterExercice({ ...base(['pieces']), source, depot, suivi });
    const deposees = depot.depots.filter((c) => c.endsWith('.zip')).map((c) => c.split('/').pop());
    expect(deposees).toEqual(reference.parties.slice(2).map((p) => p.nom));
    expect(reprise.manifesteEmpreinte).toBe(reference.manifesteEmpreinte);
    expect(cheminsDuDepot(depot).length).toBe(100);
    // Partie déposée puis altérée : refaite ; les autres restent intactes.
    const cle = [...depot.objets.keys()].find((c) => c.endsWith(reference.parties[0]?.nom ?? '')) ?? '';
    depot.objets.set(cle, enc('octets alteres'));
    depot.depots.length = 0;
    await exporterExercice({ ...base(['pieces']), source, depot, suivi });
    expect(depot.depots.filter((c) => c.endsWith('.zip')).map((c) => c.split('/').pop())).toEqual([reference.parties[0]?.nom]);
  });

  it('un-seul-rayon', async () => {
    const depot = creerDepot();
    await exporterExercice({ ...base(['declarations']), source: creerSource(), depot, suivi: creerSuivi() });
    expect(cheminsDuDepot(depot)).toEqual(['declarations/2026/tva-01.txt']);
  });

  it('deux-rayons', async () => {
    const depot = creerDepot();
    await exporterExercice({ ...base(['declarations', 'ecritures']), source: creerSource(), depot, suivi: creerSuivi() });
    const chemins = cheminsDuDepot(depot);
    expect(chemins.length).toBe(101);
    expect(chemins.some((c) => c.startsWith('pieces/'))).toBe(false);
    expect(chemins.some((c) => c.startsWith('declarations/'))).toBe(true);
    expect(chemins.some((c) => c.startsWith('ecritures/'))).toBe(true);
  });

  it('autre-exercice-exclu', async () => {
    const depot = creerDepot();
    await exporterExercice({ ...base(['pieces']), source: creerSource(), depot, suivi: creerSuivi() });
    expect(cheminsDuDepot(depot)).toEqual(fichiers().filter((f) => f.exerciceId === 'ex-2026' && f.rayon === 'pieces').map((f) => f.chemin).sort());
  });

  it('refuse les entrées invalides', async () => {
    const [source, depot, suivi] = [creerSource(), creerDepot(), creerSuivi()];
    const code = async (o: Parameters<typeof exporterExercice>[0]): Promise<string | undefined> => {
      try {
        await exporterExercice(o);
      } catch (e) {
        return e instanceof ErreurExploitation ? e.code : 'autre';
      }
      return undefined;
    };
    expect(await code({ ...base([]), source, depot, suivi })).toBe('chemin_invalide');
    expect(await code({ ...base(['../x']), source, depot, suivi })).toBe('chemin_invalide');
    expect(await code({ ...base(['pieces']), exerciceId: 'a/b', source, depot, suivi })).toBe('chemin_invalide');
    expect(await code({ ...base(['pieces'], 0), source, depot, suivi })).toBe('taille_invalide');
    expect(await code({ ...base(['pieces'], Number.NaN), source, depot, suivi })).toBe('taille_invalide');
    expect(await code({ ...base(['pieces'], -5), source, depot, suivi })).toBe('taille_invalide');
    expect(depot.depots).toEqual([]);
  });
});
