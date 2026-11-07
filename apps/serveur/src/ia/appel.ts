// Appel du modèle : alias vérifié avant l'appel, un seul secours, arrêt franc, jamais d'écriture rejouée.
export type ReponseModele = { texte: string; jetons: number; coutMicroCentimes: number; modele: string; version: string };

export interface ModeleTexte {
  completer(alias: string, entree: string, signal: AbortSignal): Promise<ReponseModele>;
}

export class ErreurModele extends Error {
  override name = 'ErreurModele';
  readonly sorte: 'serveur' | 'delai' | 'client';
  constructor(sorte: 'serveur' | 'delai' | 'client') {
    super(sorte);
    this.sorte = sorte;
  }
}

export type ParametresAppel = {
  port: ModeleTexte;
  reglage: { principal: string; secours?: string };
  listeFermee: readonly string[];
  entree: string;
  delaiMs: number;
  ecriture: boolean;
};

export type ResultatAppel =
  | { issue: 'ok' | 'secours'; reponse: ReponseModele }
  | { issue: 'arret'; code: 'ia_indisponible' | 'outil_hors_liste' };

const arret = (code: 'ia_indisponible' | 'outil_hors_liste'): ResultatAppel => ({ issue: 'arret', code });

async function tenter(p: ParametresAppel, alias: string): Promise<ReponseModele | ErreurModele> {
  const controle = new AbortController();
  let minuterie: ReturnType<typeof setTimeout> | undefined;
  const delai = new Promise<never>((_, rejeter) => {
    minuterie = setTimeout(() => {
      controle.abort();
      rejeter(new ErreurModele('delai'));
    }, p.delaiMs);
  });
  try {
    return await Promise.race([p.port.completer(alias, p.entree, controle.signal), delai]);
  } catch (e) {
    return e instanceof ErreurModele ? e : new ErreurModele('serveur');
  } finally {
    clearTimeout(minuterie);
  }
}

export async function appelerModele(p: ParametresAppel): Promise<ResultatAppel> {
  const { principal, secours } = p.reglage;
  const dansListe = (a: string) => p.listeFermee.includes(a);
  if (!dansListe(principal) || (secours !== undefined && !dansListe(secours))) return arret('outil_hors_liste');
  if (!Number.isSafeInteger(p.delaiMs) || p.delaiMs <= 0) return arret('ia_indisponible');

  const premier = await tenter(p, principal);
  if (!(premier instanceof ErreurModele)) return { issue: 'ok', reponse: premier };
  if (premier.sorte === 'client' || p.ecriture || secours === undefined) return arret('ia_indisponible');

  const second = await tenter(p, secours);
  if (second instanceof ErreurModele) return arret('ia_indisponible');
  return { issue: 'secours', reponse: second };
}
