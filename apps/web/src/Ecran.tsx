import { useState } from 'react';
import { compterEcritures, envoyerEcriture, message, modifierEcriture, type Panne, type Reponse } from './api.js';

/** Écran de test : envoie ou modifie une écriture fictive, choisit une panne, rejoue la même clé. */
export function Ecran() {
  const [cle, setCle] = useState(() => 'cle-' + crypto.randomUUID());
  const [panne, setPanne] = useState<Panne>('');
  const [resultat, setResultat] = useState('');
  const [total, setTotal] = useState<number | null>(null);

  async function afficher(appel: () => Promise<Reponse>) {
    try {
      const r = await appel();
      setResultat(r.statut === 0 || r.statut >= 500 ? message(r.statut) : r.statut + ' ' + message(r.statut));
      setTotal(await compterEcritures());
    } catch {
      setResultat(message(0));
    }
  }

  return (
    <section>
      <h1>Écran de test</h1>
      <label>
        Panne simulée{' '}
        <select aria-label="Panne" value={panne} onChange={(e) => setPanne(e.target.value as Panne)}>
          <option value="">Aucune</option>
          <option value="403">403</option>
          <option value="409">409</option>
          <option value="423">423</option>
        </select>
      </label>{' '}
      <button onClick={() => void afficher(() => envoyerEcriture(cle, 'Achat fictif', 1250, panne))}>Envoyer</button>{' '}
      <button onClick={() => void afficher(() => modifierEcriture('cle-' + crypto.randomUUID(), 'E1', 1, panne))}>Modifier</button>{' '}
      <button onClick={() => setCle('cle-' + crypto.randomUUID())}>Nouvelle clé</button>
      <p data-testid="resultat">{resultat}</p>
      <p data-testid="total">{total === null ? '' : total + ' écriture(s)'}</p>
    </section>
  );
}
