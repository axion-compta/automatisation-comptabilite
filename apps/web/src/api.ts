export type Panne = '' | '403' | '409' | '423';
export type Reponse = { statut: number; corps: unknown };

/** Envoie une écriture (le corps est celui du contrat) ; la clé d'idempotence est fournie par l'appelant. */
export async function envoyerEcriture(cle: string, libelle: string, montantCentimes: number, panne: Panne): Promise<Reponse> {
  const entetes: Record<string, string> = { 'content-type': 'application/json', 'idempotency-key': cle };
  if (panne) entetes['x-panne'] = panne;
  const r = await fetch('/ecritures', { method: 'POST', headers: entetes, body: JSON.stringify({ libelle, montantCentimes }) });
  return { statut: r.status, corps: await r.json().catch(() => null) };
}

/** Nombre d'écritures, quelle que soit la forme de la réponse (liste ou { body }). */
export async function compterEcritures(): Promise<number> {
  const r = await fetch('/ecritures');
  const j: unknown = await r.json();
  const liste = Array.isArray(j) ? j : (j as { body?: unknown[] }).body;
  return Array.isArray(liste) ? liste.length : 0;
}

const MESSAGES: Record<number, string> = {
  200: 'Écriture enregistrée.',
  400: 'Requête invalide.',
  403: 'Accès refusé.',
  409: 'Conflit de version.',
  423: 'Ressource verrouillée.',
};
export const message = (statut: number): string => MESSAGES[statut] ?? 'Erreur ' + statut + '.';
