import { useState, type FormEvent } from 'react';
import { ReponsePieces, type PieceResume } from '../../../../../packages/contrat/src/domaines/pieces.js';
import { centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { e07 } from '../../../../../packages/textes/src/ecrans/e07.js';
import { EtatChargement, EtatErreur, EtatVide } from '../../../../../packages/ui/src/composants/Etats.js';
import { MotConfiance } from '../../../../../packages/ui/src/composants/MotConfiance.js';
import { Montant } from '../../../../../packages/ui/src/composants/Montant.js';
import { Tableau } from '../../../../../packages/ui/src/composants/Tableau.js';
import { formaterDateAffiche, formaterMontantAffiche } from '../../../../../packages/ui/src/format/affichage.js';
import { useLecture } from '../../donnees/lecture.js';

const LIMITE = 50;
type Filtres = { fournisseur: string; du: string; au: string; etat: string; type: string };
const VIDE: Filtres = { fournisseur: '', du: '', au: '', etat: '', type: '' };
const MOTS = ['sur', 'a_verifier', 'douteux'] as const;
const remplir = (modele: string, valeurs: Record<string, string | number>): string =>
  Object.entries(valeurs).reduce((t, [k, v]) => t.replace('{' + k + '}', String(v)), modele);
const texte = (table: Record<string, string>, cle: string): string => table[cle] ?? cle;

export function cheminPieces(f: Filtres, decalage: number): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v.trim() !== '') p.set(k, v.trim());
  p.set('limite', String(LIMITE));
  p.set('decalage', String(decalage));
  return '/pieces?' + p.toString();
}

function Champ({ nom, valeur, surChange, type = 'text', options }: { nom: string; valeur: string; surChange(v: string): void; type?: string; options?: Record<string, string> }) {
  return (
    <label>
      {nom}
      {options ? (
        <select value={valeur} onChange={(e) => surChange(e.target.value)}>
          <option value="">{e07.filtres.tous}</option>
          {Object.entries(options).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      ) : (
        <input type={type} value={valeur} onChange={(e) => surChange(e.target.value)} />
      )}
    </label>
  );
}

const fournisseurDe = (p: PieceResume) => (p.sensible ? e07.tableau.protegee : (p.fournisseur ?? e07.tableau.inconnu));
const etatDe = (p: PieceResume) => (
  <>
    {texte(e07.etats, p.etat)}
    {p.comptee ? null : <> <strong>{remplir(e07.tableau.nonCompteeMotif, { motif: texte(e07.etats, p.etat) })}</strong></>}
  </>
);

/** Écran E07 : pièces en lecture seule, filtres envoyés par Entrée ou bouton. Aucun total calculé ici. */
export function Ecran() {
  const [saisie, setSaisie] = useState<Filtres>(VIDE);
  const [appliques, setAppliques] = useState<Filtres>(VIDE);
  const [decalage, setDecalage] = useState(0);
  const lecture = useLecture(cheminPieces(appliques, decalage), ReponsePieces);
  const maj = (cle: keyof Filtres) => (v: string) => setSaisie((s) => ({ ...s, [cle]: v }));
  function envoyer(e: FormEvent) {
    e.preventDefault();
    setAppliques(saisie);
    setDecalage(0);
  }
  let corps = null;
  if (lecture.etat === 'chargement') corps = <EtatChargement libelle={e07.etatsEcran.chargement} />;
  else if (lecture.etat === 'erreur') corps = <EtatErreur message={lecture.erreur?.code === 'acces_refuse' ? e07.etatsEcran.acces : e07.etatsEcran.erreur} />;
  else if (lecture.etat === 'vide') corps = <EtatVide titre={e07.etatsEcran.vide} />;
  else if (lecture.donnees) {
    const d = lecture.donnees;
    corps = (
      <Tableau
        legende={e07.tableau.legende}
        colonnes={[
          { cle: 'date', entete: e07.tableau.date, rendu: (p) => (p.datePiece ? formaterDateAffiche(p.datePiece) : e07.tableau.inconnu) },
          { cle: 'fournisseur', entete: e07.tableau.fournisseur, rendu: fournisseurDe },
          { cle: 'nom', entete: e07.tableau.nom, rendu: (p) => <a href={'/documents/piece?id=' + encodeURIComponent(p.id)} aria-label={remplir(e07.tableau.ouvrir, { nom: p.nomNormalise })}>{p.nomNormalise}</a> },
          { cle: 'ttc', entete: e07.tableau.ttc, alignement: 'droite', rendu: (p) => (p.ttcCentimes === undefined ? e07.tableau.inconnu : <Montant centimes={centimes(p.ttcCentimes)} libelleNegatif={remplir(e07.tableau.montantNegatif, { montant: formaterMontantAffiche(centimes(p.ttcCentimes)) })} />) },
          { cle: 'etat', entete: e07.tableau.etat, rendu: etatDe },
          { cle: 'confiance', entete: e07.tableau.confiance, rendu: (p) => <MotConfiance mot={MOTS.find((m) => m === p.motConfiance) ?? 'a_verifier'} libelles={e07.confiance} /> },
        ]}
        lignes={d.body}
        cleDeLigne={(p) => p.id}
        pagination={{ decalage: d.decalage, limite: LIMITE, total: d.total, libellePrecedent: e07.pagination.precedent, libelleSuivant: e07.pagination.suivant, surPage: setDecalage, resume: (debut, fin, total) => remplir(e07.pagination.resume, { debut, fin, total }) }}
      />
    );
  }
  return (
    <section aria-labelledby="e07-titre">
      <h1 id="e07-titre">{e07.titre}</h1>
      <form onSubmit={envoyer} aria-label={e07.filtres.groupe}>
        <Champ nom={e07.filtres.fournisseur} valeur={saisie.fournisseur} surChange={maj('fournisseur')} />
        <Champ nom={e07.filtres.du} type="date" valeur={saisie.du} surChange={maj('du')} />
        <Champ nom={e07.filtres.au} type="date" valeur={saisie.au} surChange={maj('au')} />
        <Champ nom={e07.filtres.etat} valeur={saisie.etat} surChange={maj('etat')} options={e07.etats} />
        <Champ nom={e07.filtres.type} valeur={saisie.type} surChange={maj('type')} options={e07.types} />
        <button type="submit">{e07.filtres.envoyer}</button>
      </form>
      <div aria-live="polite">{corps}</div>
      <p>{e07.prepare}</p>
    </section>
  );
}
