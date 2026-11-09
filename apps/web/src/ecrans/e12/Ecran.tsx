import { useQuery } from '@tanstack/react-query';
import { useRef, useState, type KeyboardEvent } from 'react';
import { lire } from '../../api.js';
import { EtatLigne, ReponseComptesBancaires, ReponseLignesBancaires } from '../../../../../packages/contrat/src/domaines/banque.js';
import { centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { ETATS_LIGNE, etatLigne } from '../../../../../packages/textes/src/banque/mots.js';
import { e12 } from '../../../../../packages/textes/src/ecrans/e12.js';
import { EtatChargement, EtatErreur, EtatVide } from '../../../../../packages/ui/src/composants/Etats.js';
import { Montant } from '../../../../../packages/ui/src/composants/Montant.js';
import { Pastille, type EtatPastille } from '../../../../../packages/ui/src/composants/Pastille.js';
import { Tableau } from '../../../../../packages/ui/src/composants/Tableau.js';
import { formaterDateAffiche, formaterMontantAffiche } from '../../../../../packages/ui/src/format/affichage.js';
import { useLecture } from '../../donnees/lecture.js';
import { AJustifier, useNombreDemandes } from './AJustifier.js';
import { Couverture } from './Couverture.js';
import { Explication } from './Explication.js';
import './e12.css';
const LIMITE = 20;
const PAGE_MAX = 100;
type Etat = (typeof ETATS_LIGNE)[number];
// Aucun « ok » implicite : une ligne rapprochée reste en attente.
const PASTILLE: Record<Etat, EtatPastille> = {
  RAPPROCHEE: 'attente', PROPOSEE: 'attente', A_QUALIFIER: 'attente',
  DOUTEUSE: 'bloque', SANS_PIECE: 'bloque',
  SANS_PIECE_REQUISE: 'ok', NEUTRALISEE: 'ok', PERSO: 'ok', IGNOREE: 'ok',
};
const remplir = (modele: string, valeurs: Record<string, string | number>): string =>
  Object.entries(valeurs).reduce((t, [k, v]) => t.replace('{' + k + '}', String(v)), modele);
const montant = (c: number) => <Montant centimes={centimes(c)} libelleNegatif={remplir(e12.tableau.montantNegatif, { montant: formaterMontantAffiche(centimes(c)) })} />;
export function cheminLignes(etat: Etat | undefined, compte: string, decalage: number): string {
  const p = new URLSearchParams();
  if (etat) p.set('etat', etat);
  if (compte !== '') p.set('compte', compte);
  p.set('limite', String(LIMITE));
  p.set('decalage', String(decalage));
  return '/banque/lignes?' + p.toString();
}
export function etatDepuisUrl(recherche: string): Etat | undefined {
  const brut = new URLSearchParams(recherche).get('etat');
  const r = EtatLigne.safeParse(brut);
  return r.success ? r.data : undefined;
}
/** Toutes les lignes (page par page, sans filtre) pour retrouver celles d'une demande où qu'elles soient. */
async function toutesLesLignes(signal: AbortSignal) {
  const out: (typeof ReponseLignesBancaires._output)['body'] = [];
  for (let d = 0; ; d += PAGE_MAX) {
    const r = await lire('/banque/lignes?limite=' + PAGE_MAX + '&decalage=' + d, ReponseLignesBancaires, signal);
    out.push(...r.body);
    if (r.body.length === 0 || d + PAGE_MAX >= r.total) return out;
  }
}
type Lecture = { etat: string; erreur?: { code: string } };
/** Chargement, erreur ou vide d'une lecture ; null quand les données sont prêtes. */
function etatDe(l: Lecture, vide: string) {
  if (l.etat === 'chargement') return <EtatChargement libelle={e12.etats.chargement} />;
  if (l.etat === 'erreur') return <EtatErreur message={l.erreur?.code === 'acces_refuse' ? e12.etats.acces : e12.etats.erreur} />;
  return l.etat === 'vide' ? <EtatVide titre={vide} /> : null;
}
/** Écran E12 : comptes et lignes en lecture seule, filtre par état gardé dans l'URL. */
export function Ecran() {
  const [etat, setEtat] = useState<Etat | undefined>(() => etatDepuisUrl(window.location.search));
  const [compte, setCompte] = useState('');
  const [decalage, setDecalage] = useState(0);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [onglet, setOnglet] = useState<'lignes' | 'justifier'>('lignes');
  const [ids, setIds] = useState<string[] | null>(null);
  const onglets = useRef(new Map<string, HTMLButtonElement>());
  const nbDemandes = useNombreDemandes();
  function auClavier(e: KeyboardEvent) {
    const ordre = ['lignes', 'justifier'] as const;
    const i = ordre.indexOf(onglet);
    const k = { ArrowRight: (i + 1) % 2, ArrowLeft: (i + 1) % 2, Home: 0, End: 1 }[e.key];
    if (k === undefined) return;
    e.preventDefault();
    setOnglet(ordre[k]!);
    onglets.current.get(ordre[k]!)?.focus();
  }
  const boutons = useRef(new Map<string, HTMLButtonElement>());
  function fermer() {
    const id = ouverte;
    setOuverte(null);
    if (id !== null) setTimeout(() => boutons.current.get(id)?.focus());
  }
  const demande = useQuery({ queryKey: ['lecture', 'e12-demande', ids], enabled: ids !== null, queryFn: ({ signal }) => toutesLesLignes(signal) });
  const comptes = useLecture('/banque/comptes', ReponseComptesBancaires);
  const lignes = useLecture(cheminLignes(etat, compte, decalage), ReponseLignesBancaires);
  function choisirEtat(valeur: string) {
    const r = EtatLigne.safeParse(valeur);
    const url = new URL(window.location.href);
    if (r.success) url.searchParams.set('etat', r.data);
    else url.searchParams.delete('etat');
    window.history.replaceState(null, '', url);
    setEtat(r.success ? r.data : undefined);
    setDecalage(0);
  }
  let blocComptes = etatDe(comptes, e12.etats.videComptes);
  if (!blocComptes && comptes.donnees) {
    blocComptes = (
      <ul className="e12-cartes" aria-label={e12.comptes.liste}>
        {comptes.donnees.body.map((c) => (
          <li key={c.id} className="e12-carte">
            <strong>{c.nom}</strong>
            <p>{c.banque}</p>
            <p>{c.ibanMasque}</p>
            <p>{montant(c.soldeCentimes)}</p>
            <p>{remplir(e12.comptes.solde, { date: formaterDateAffiche(c.soldeLe) })}</p>
          </li>
        ))}
      </ul>
    );
  }
  let blocLignes = ids ? etatDe({ etat: demande.isError ? 'erreur' : demande.data ? 'pret' : 'chargement' }, '') : etatDe(lignes, e12.etats.videLignes);
  const d = ids ? (demande.data ? { body: demande.data.filter((l) => ids.includes(l.id)), decalage: 0, total: ids.length } : undefined) : lignes.donnees;
  if (!blocLignes && d) {
    blocLignes = (
      <Tableau
        legende={e12.tableau.legende}
        colonnes={[
          { cle: 'date', entete: e12.tableau.date, rendu: (l) => formaterDateAffiche(l.date) },
          { cle: 'libelle', entete: e12.tableau.libelle, rendu: (l) => l.libelle },
          { cle: 'montant', entete: e12.tableau.montant, alignement: 'droite', rendu: (l) => montant(l.montantCentimes) },
          { cle: 'etat', entete: e12.tableau.etat, rendu: (l) => <Pastille etat={PASTILLE[l.etat]} libelle={etatLigne(l.etat)} /> },
          { cle: 'pourquoi', entete: e12.tableau.pourquoi, rendu: (l) => (
            <button type="button" ref={(b) => void (b ? boutons.current.set(l.id, b) : boutons.current.delete(l.id))} aria-expanded={ouverte === l.id}
              aria-label={remplir(e12.tableau.pourquoiLigne, { libelle: l.libelle })} onClick={() => setOuverte(l.id)}>{e12.tableau.pourquoi}</button>
          ) },
        ]}
        lignes={d.body}
        cleDeLigne={(l) => l.id}
        {...(ids ? {} : { pagination: { decalage: d.decalage, limite: LIMITE, total: d.total, libellePrecedent: e12.pagination.precedent, libelleSuivant: e12.pagination.suivant, surPage: setDecalage,
          resume: (debut, fin, total) => remplir(e12.pagination.resume, { debut, fin, total }) } })}
      />
    );
  }
  return (
    <section aria-labelledby="e12-titre">
      <h1 id="e12-titre">{e12.titre}</h1>
      <div role="tablist" aria-label={e12.onglets.liste} onKeyDown={auClavier}>
        {([['lignes', e12.onglets.lignes], ['justifier', nbDemandes === undefined ? e12.onglets.aJustifierSansNombre : e12.onglets.aJustifier.replace('{nombre}', String(nbDemandes))]] as const).map(([cle, texte]) => (
          <button key={cle} type="button" role="tab" id={'e12-onglet-' + cle} aria-selected={onglet === cle} aria-controls="e12-panneau" tabIndex={onglet === cle ? 0 : -1}
            ref={(b) => void (b ? onglets.current.set(cle, b) : onglets.current.delete(cle))} onClick={() => setOnglet(cle)}>{texte}</button>
        ))}
      </div>
      <div role="tabpanel" id="e12-panneau" aria-labelledby={'e12-onglet-' + onglet}>
      {onglet === 'justifier' ? <AJustifier surVoirLignes={(l) => (setIds(l), setOnglet('lignes'))} /> : <>
      {blocComptes}
      {(compte || comptes.donnees?.body[0]?.id) && <Couverture compteId={compte || comptes.donnees?.body[0]?.id || ''} />}
      <div className="e12-filtres">
        <label>
          {e12.filtres.etat}
          <select value={etat ?? ''} onChange={(e) => choisirEtat(e.target.value)}>
            <option value="">{e12.filtres.tous}</option>
            {ETATS_LIGNE.map((v) => (
              <option key={v} value={v}>{v === 'SANS_PIECE' ? e12.filtres.sansPiece : etatLigne(v)}</option>
            ))}
          </select>
        </label>
        <label>
          {e12.filtres.compte}
          <select value={compte} onChange={(e) => (setCompte(e.target.value), setDecalage(0))}>
            <option value="">{e12.filtres.tous}</option>
            {(comptes.donnees?.body ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </label>
      </div>
      {ids && <p role="status">{e12.aJustifier.filtreActif} <button type="button" onClick={() => setIds(null)}>{e12.aJustifier.retirerFiltre}</button></p>}
      <div aria-live="polite">{blocLignes}</div>
      {ouverte !== null && <Explication ligneId={ouverte} surFermeture={fermer} />}
      </>}
      </div>
    </section>
  );
}
