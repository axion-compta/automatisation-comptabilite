export type Panne = '' | '403' | '409' | '423';
/** statut 0 = le serveur n'a pas répondu (réseau). */
export type Reponse = { statut: number; corps: unknown };
async function appeler(url: string, methode: string, cle: string, corps: unknown, panne: Panne): Promise<Reponse> {
  const entetes: Record<string, string> = { 'content-type': 'application/json', 'idempotency-key': cle };
  if (panne) entetes['x-panne'] = panne;
  try {
    const r = await fetch(url, { method: methode, headers: entetes, body: JSON.stringify(corps) });
    return { statut: r.status, corps: await r.json().catch(() => null) };
  } catch {
    return { statut: 0, corps: null };
  }
}
/** Envoie une écriture (le corps est celui du contrat) ; la clé d'idempotence est fournie par l'appelant. */
export function envoyerEcriture(cle: string, libelle: string, montantCentimes: number, panne: Panne): Promise<Reponse> {
  return appeler('/ecritures', 'POST', cle, { libelle, montantCentimes }, panne);
}
/** Modifie une écriture existante ; 409 si la version est périmée. */
export function modifierEcriture(cle: string, id: string, version: number, panne: Panne): Promise<Reponse> {
  return appeler('/ecritures/' + encodeURIComponent(id), 'PUT', cle, { libelle: 'Achat fictif modifié', montantCentimes: 1300, version }, panne);
}
/** Nombre d'écritures, ou null si le serveur ne répond pas. */
export async function compterEcritures(): Promise<number | null> {
  try {
    const r = await fetch('/ecritures');
    const j: unknown = await r.json();
    // TODO fiche de suivi alignement MSW : double forme (liste nue du faux serveur, { body } du vrai serveur oRPC).
    const liste = Array.isArray(j) ? j : (j as { body?: unknown[] }).body;
    return Array.isArray(liste) ? liste.length : null;
  } catch {
    return null;
  }
}
const MESSAGES: Record<number, string> = {
  200: 'Écriture enregistrée.',
  400: 'Requête invalide.',
  403: 'Accès refusé.',
  409: 'Conflit de version.',
  423: 'Ressource verrouillée.',
};
/** Texte affiché ; réseau coupé ou erreur serveur (5xx, réponse non JSON) : « Erreur réseau. ». */
export const message = (statut: number): string =>
  statut === 0 || statut >= 500 ? 'Erreur réseau.' : (MESSAGES[statut] ?? 'Erreur ' + statut + '.');
