import { lireEvenement, type Evenement } from './evenements.js';

// Flux du chat (SSE) : codage et décodage purs, partagés par le serveur et le navigateur.
const idValide = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 1;

export function encoderEvenement(id: number, evt: Evenement): string {
  if (!idValide(id)) throw new RangeError('id_invalide');
  return `id: ${id}\nevent: ${evt.type}\ndata: ${JSON.stringify({ ...evt, id })}\n\n`;
}

/** Décodeur tolérant : ne lève jamais ; un événement illisible est ignoré, un id qui ne croît pas est compté dans `ignores`. */
export class DecodeurFlux {
  ignores = 0;
  dernierId = 0;
  private tampon = '';

  pousser(morceau: string): Evenement[] {
    if (typeof morceau !== 'string') return [];
    try {
      const texte = this.tampon + morceau;
      const retenu = texte.endsWith('\r') ? '\r' : '';
      const net = texte.slice(0, texte.length - retenu.length).replace(/\r\n?/g, '\n');
      const fin = net.lastIndexOf('\n\n');
      if (fin < 0) {
        this.tampon = net + retenu;
        return [];
      }
      this.tampon = net.slice(fin + 2) + retenu;
      const sortie: Evenement[] = [];
      for (const bloc of net.slice(0, fin).split('\n\n')) {
        const evt = this.lireBloc(bloc);
        if (evt) sortie.push(evt);
      }
      return sortie;
    } catch {
      this.tampon = '';
      return [];
    }
  }

  private lireBloc(bloc: string): Evenement | null {
    let id: string | undefined;
    let type: string | undefined;
    const data: string[] = [];
    for (const ligne of bloc.split('\n')) {
      if (ligne === '' || ligne.startsWith(':')) continue;
      const i = ligne.indexOf(':');
      const champ = i < 0 ? ligne : ligne.slice(0, i);
      const valeur = i < 0 ? '' : ligne.slice(i + 1).replace(/^ /, '');
      if (champ === 'id') id = valeur;
      else if (champ === 'event') type = valeur;
      else if (champ === 'data') data.push(valeur);
    }
    if (id === undefined || !/^\d+$/.test(id) || data.length === 0) return null;
    const n = Number(id);
    if (!idValide(n)) return null;
    let brut: unknown;
    try {
      brut = JSON.parse(data.join('\n'));
    } catch {
      return null;
    }
    if (brut === null || typeof brut !== 'object' || Array.isArray(brut)) return null;
    const evt = lireEvenement({ ...(brut as Record<string, unknown>), id: n });
    if (!evt || (type !== undefined && type !== evt.type)) return null;
    if (n <= this.dernierId) {
      this.ignores++;
      return null;
    }
    this.dernierId = n;
    return evt;
  }
}

export interface EntreeJournal {
  id: number;
  horodatage: number;
  evt: Evenement;
}

/** Événements d'id > `dernierId` encore conservés. `dernierId` invalide : tout le journal conservé. Durée de conservation en argument. */
export function reprendreApres(journal: readonly EntreeJournal[], dernierId: unknown, maintenant: number, conservationMs: number): Evenement[] {
  if (!Number.isFinite(maintenant) || !Number.isFinite(conservationMs) || conservationMs < 0) return [];
  const depart = typeof dernierId === 'number' && Number.isSafeInteger(dernierId) && dernierId >= 0 ? dernierId : 0;
  const vus = new Set<number>();
  return journal
    .filter((j) => j.id > depart && maintenant - j.horodatage <= conservationMs)
    .sort((a, b) => a.id - b.id)
    .filter((j) => !vus.has(j.id) && vus.add(j.id))
    .map((j) => j.evt);
}
