import { useEffect, useRef, useState } from 'react';
import type { Centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { controleSolde, dejaImporte, questionImport, type CodeQuestionImport } from '../../../../../packages/textes/src/banque/mots.js';
import { e03Releve as t } from '../../../../../packages/textes/src/ecrans/e03-releve.js';
import { EtatChargement } from '../../../../../packages/ui/src/composants/Etats.js';
import { formaterDateAffiche, formaterMontantAffiche } from '../../../../../packages/ui/src/format/affichage.js';
/** Nombre de lignes montrées dans l'aperçu (spec 02, fichier 02). */
export const LIGNES_APERCU = 10;
export type RapportReleve = {
  id: string;
  etat: 'apercu' | 'a_confirmer' | 'refuse' | 'vide' | 'deja_importe';
  apercu: { date: string; montant: Centimes; libelle: string }[];
  questions: { code: CodeQuestionImport; choix: string[] }[];
  compteurs: { lues: number; importees: number; rejetees: number };
  controle: 'OK' | 'ECART' | 'IMPOSSIBLE';
  ecart?: Centimes;
  motifRefus?: 'solde_pdf_faux' | 'format_inconnu' | 'xml_refuse';
  dejaImporteLe?: string;
};
export interface ServiceImportReleve {
  deposer(f: File): Promise<RapportReleve>;
  repondre(id: string, code: CodeQuestionImport, choix: string): Promise<RapportReleve>;
  confirmer(id: string): Promise<RapportReleve>;
  annuler(id: string): Promise<void>;
}
const remplir = (m: string, k: RapportReleve['compteurs']) =>
  m.replace('{lues}', String(k.lues)).replace('{importees}', String(k.importees)).replace('{rejetees}', String(k.rejetees));
const dateSure = (d: string) => {
  try { return formaterDateAffiche(d); } catch { return d; }
};
function phraseDejaImporte(iso?: string): string {
  try { return dejaImporte(formaterDateAffiche((iso ?? '').slice(0, 10))); } catch { return t.dejaImporteSansDate; }
}
function texteControle(r: RapportReleve): string {
  if (r.controle !== 'ECART') return controleSolde(r.controle === 'OK' ? 'verifie' : 'impossible');
  return controleSolde('ecart', r.ecart === undefined ? undefined : formaterMontantAffiche(r.ecart));
}
/** Import d'un relevé (état de E03). Le serveur fait foi : l'écran ne lit pas le fichier. */
export function ImportReleve({ service, fichier }: { service: ServiceImportReleve; fichier: File }) {
  const [rapport, setRapport] = useState<RapportReleve | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [panne, setPanne] = useState(false);
  const [confirme, setConfirme] = useState(false);
  const [annule, setAnnule] = useState(false);
  const verrou = useRef(false);
  async function appeler(action: () => Promise<RapportReleve | void>, apres?: () => void) {
    if (verrou.current) return;
    verrou.current = true;
    setOccupe(true);
    setPanne(false);
    try {
      const r = await action();
      if (r) setRapport(r);
      apres?.();
    } catch {
      setRapport(null);
      setPanne(true);
    } finally {
      verrou.current = false;
      setOccupe(false);
    }
  }
  useEffect(() => void appeler(() => service.deposer(fichier)), [service, fichier]);
  const question = rapport?.questions[0];
  const modeles = question ? questionImport(question.code) : null;
  const montreApercu = rapport !== null && (rapport.etat === 'apercu' || rapport.etat === 'a_confirmer') && !annule;
  return (
    <section>
      <h2>{t.titre}</h2>
      {occupe ? <EtatChargement libelle={t.etats.chargement} /> : null}
      {panne ? <p role="alert">{t.etats.panne}</p> : null}
      {annule ? <p role="status">{t.annule}</p> : null}
      {rapport?.etat === 'deja_importe' ? <p>{phraseDejaImporte(rapport.dejaImporteLe)}</p> : null}
      {rapport?.etat === 'refuse' ? <p>{rapport.motifRefus ? t.refus[rapport.motifRefus] : t.refus.format_inconnu}</p> : null}
      {rapport?.etat === 'vide' ? <p>{t.vide}</p> : null}
      {montreApercu ? (
        <>
          {rapport.apercu.length > 0 ? (
            <table>
              <caption>{t.apercu.legende}</caption>
              <thead><tr><th>{t.apercu.date}</th><th>{t.apercu.libelle}</th><th>{t.apercu.montant}</th></tr></thead>
              <tbody>
                {rapport.apercu.slice(0, LIGNES_APERCU).map((l, i) => (
                  <tr key={i}><td>{dateSure(l.date)}</td><td>{l.libelle}</td><td>{formaterMontantAffiche(l.montant)}</td></tr>
                ))}
              </tbody>
            </table>
          ) : null}
          <p>{texteControle(rapport)}</p>
          {question && modeles ? (
            <div>
              <p>{modeles.question}</p>
              {question.choix.map((choix, i) => (
                <button key={choix} type="button" data-choix={choix} disabled={occupe}
                  onClick={() => void appeler(() => service.repondre(rapport.id, question.code, choix))}>
                  {modeles.reponses[i] ?? choix}
                </button>
              ))}
            </div>
          ) : null}
          <p role="status" aria-label={t.rapport.titre}>{remplir(t.rapport.comptes, rapport.compteurs)}</p>
          {confirme ? (
            <button type="button" disabled={occupe} onClick={() => void appeler(() => service.annuler(rapport.id), () => setAnnule(true))}>{t.boutons.annuler}</button>
          ) : (
            <button type="button" disabled={occupe || question !== undefined}
              onClick={() => void appeler(() => service.confirmer(rapport.id), () => setConfirme(true))}>
              {t.boutons.confirmer}
            </button>
          )}
        </>
      ) : null}
    </section>
  );
}
