import { useState, type KeyboardEvent } from 'react';
import { ReponseTiers } from '../../../../../packages/contrat/src/domaines/tiers.js';
import { e44 } from '../../../../../packages/textes/src/ecrans/e44.js';
import { EtatChargement, EtatErreur, EtatVide } from '../../../../../packages/ui/src/composants/Etats.js';
import { Tableau } from '../../../../../packages/ui/src/composants/Tableau.js';
import { BoutonExporter } from '../../socle/BoutonExporter.js';
import { useLecture } from '../../donnees/lecture.js';
const LIMITE = 50;
const CHEMIN_CLIENT = '/reglages/entreprise/client?code=';
const MAX_RECHERCHE = 50;
type Filtre = 'tous' | 'client' | 'fournisseur';
const ONGLETS: { id: Filtre; texte: string }[] = [
  { id: 'tous', texte: e44.onglets.tous },
  { id: 'client', texte: e44.onglets.clients },
  { id: 'fournisseur', texte: e44.onglets.fournisseurs },
];
/** Chemin de lecture de GET /tiers pour un filtre, une recherche et une page. */
export function cheminTiers(filtre: Filtre, recherche: string, decalage: number): string {
  const p = new URLSearchParams();
  if (filtre !== 'tous') p.set('type', filtre);
  const q = recherche.trim().slice(0, MAX_RECHERCHE);
  if (q !== '') p.set('q', q);
  p.set('limite', String(LIMITE));
  p.set('decalage', String(decalage));
  return '/tiers?' + p.toString();
}
/** Filtres courants de l'écran, au format de l'export (mêmes que GET /tiers, sans la page). */
function filtresExport(filtre: Filtre, recherche: string): Record<string, string> {
  const q = recherche.trim().slice(0, MAX_RECHERCHE);
  return { ...(filtre !== 'tous' ? { type: filtre } : {}), ...(q !== '' ? { q } : {}) };
}
/** Écran E44 : lecture des clients et fournisseurs, onglets, recherche, pagination. */
export function Ecran() {
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const [recherche, setRecherche] = useState('');
  const [decalage, setDecalage] = useState(0);
  const lecture = useLecture(cheminTiers(filtre, recherche, decalage), ReponseTiers);
  const choisir = (id: Filtre) => (setFiltre(id), setDecalage(0));
  function auClavier(e: KeyboardEvent, index: number) {
    const pas = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (pas === 0) return;
    e.preventDefault();
    const cible = ONGLETS[(index + pas + ONGLETS.length) % ONGLETS.length];
    if (!cible) return;
    choisir(cible.id);
    document.getElementById('e44-onglet-' + cible.id)?.focus();
  }
  let contenu = null;
  if (lecture.etat === 'chargement') {
    contenu = <EtatChargement libelle={e44.etats.chargement} />;
  } else if (lecture.etat === 'erreur') {
    contenu = <EtatErreur message={lecture.erreur?.code === 'acces_refuse' ? e44.etats.acces : e44.etats.erreur} />;
  } else if (lecture.etat === 'vide') {
    contenu = recherche.trim() !== '' ? <EtatVide titre={e44.etats.videRecherche} detail={e44.etats.videRechercheDetail} /> : <EtatVide titre={e44.etats.vide} />;
  } else if (lecture.donnees) {
    const d = lecture.donnees;
    contenu = (
      <Tableau
        legende={e44.tableau.legende}
        colonnes={[
          { cle: 'code', entete: e44.tableau.code, rendu: (t) => t.code },
          { cle: 'nom', entete: e44.tableau.nom, rendu: (t) => (t.type === 'client' ? <a href={CHEMIN_CLIENT + encodeURIComponent(t.code)}>{t.nom}</a> : t.nom) },
          { cle: 'type', entete: e44.tableau.type, rendu: (t) => (t.type === 'client' ? e44.tableau.client : e44.tableau.fournisseur) },
          { cle: 'email', entete: e44.tableau.email, rendu: (t) => t.email },
        ]}
        lignes={d.body}
        cleDeLigne={(t) => t.code}
        pagination={{ decalage: d.decalage, limite: LIMITE, total: d.total, libellePrecedent: e44.pagination.precedent, libelleSuivant: e44.pagination.suivant, surPage: setDecalage,
          resume: (debut, fin, total) => e44.pagination.resume.replace('{debut}', String(debut)).replace('{fin}', String(fin)).replace('{total}', String(total)) }}
      />
    );
  }
  return (
    <section aria-labelledby="e44-titre">
      <h1 id="e44-titre">{e44.titre}</h1>
      <div role="tablist" aria-label={e44.onglets.nom}>
        {ONGLETS.map((o, i) => (
          <button
            key={o.id}
            type="button"
            role="tab"
            id={'e44-onglet-' + o.id}
            aria-selected={filtre === o.id}
            aria-controls="e44-panneau"
            tabIndex={filtre === o.id ? 0 : -1}
            onClick={() => choisir(o.id)}
            onKeyDown={(e) => auClavier(e, i)}
          >
            {o.texte}
          </button>
        ))}
      </div>
      <input
        type="search"
        aria-label={e44.recherche.nom}
        maxLength={MAX_RECHERCHE}
        value={recherche}
        onChange={(e) => (setRecherche(e.target.value), setDecalage(0))}
      />
      <BoutonExporter liste="listerTiers" filtres={filtresExport(filtre, recherche)} textes={e44.export} />
      <div role="tabpanel" id="e44-panneau" aria-labelledby={'e44-onglet-' + filtre}>
        {contenu}
      </div>
    </section>
  );
}
