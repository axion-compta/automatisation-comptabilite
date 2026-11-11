import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Apercu, ChangementConfirme } from '../../../../../packages/contrat/src/domaines/profil-changements.js';
import { e45 } from '../../../../../packages/textes/src/ecrans/e45.js';
import { ErreurEcriture, ecrire, nouvelleCle, type SchemaLecture } from '../../api.js';

type Action = () => Promise<void>;
const m = e45.modification;
const reponseApercu: SchemaLecture<{ body: Apercu }> = z.object({ body: Apercu });
const reponseChangement: SchemaLecture<unknown> = z.object({ body: ChangementConfirme });
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const jourValide = (s: string): boolean => {
  const t = Date.parse(s + 'T00:00:00Z');
  return ISO.test(s) && !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
};
const intitule = (cle: string): string => (Object.hasOwn(e45.champs, cle) ? (e45.champs as Record<string, string>)[cle]! : cle);
const phrase = (e: unknown): string => {
  const code = e instanceof ErreurEcriture ? e.code : '';
  return Object.hasOwn(m.erreurs, code) ? (m.erreurs as Record<string, string>)[code]! : m.erreurs.autre;
};

/** Modifier un champ : l'aperçu chiffré d'abord, rien n'est enregistré sans « Confirmer ». */
export function Modification({ cle, surFermer }: { cle: string; surFermer: () => void }) {
  const client = useQueryClient();
  const [valeur, setValeur] = useState('');
  const [date, setDate] = useState('');
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [statut, setStatut] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const occupe = useRef(false);
  const cleApercu = useRef(nouvelleCle());
  const cleConfirmation = useRef(nouvelleCle());
  const alerte = useRef<HTMLParagraphElement>(null);
  useEffect(() => void (erreur && alerte.current?.focus()), [erreur]);
  async function garder(action: Action) {
    if (occupe.current) return;
    occupe.current = true;
    setEnvoi(true);
    setErreur('');
    try {
      await action();
    } catch (e) {
      setErreur(phrase(e));
    } finally {
      occupe.current = false;
      setEnvoi(false);
    }
  }
  const demander = async (): Promise<void> => {
    const demande = { cle, valeur, effetDebut: date, motif: m.motif };
    const r = await ecrire('POST', '/profil/changements/apercu', demande, reponseApercu, cleApercu.current);
    cleApercu.current = nouvelleCle();
    setApercu(r.body);
  };
  const voirEffet = () => {
    setStatut('');
    if (valeur.trim() === '') return setErreur(m.valeurVide);
    if (!jourValide(date)) return setErreur(m.dateInvalide);
    return garder(demander);
  };
  const confirmer = () =>
    garder(async () => {
      try {
        await ecrire('POST', '/profil/changements', { apercuId: apercu?.apercuId }, reponseChangement, cleConfirmation.current);
      } catch (e) {
        if (!(e instanceof ErreurEcriture) || e.code !== 'APERCU_PERIME') throw e;
        cleConfirmation.current = nouvelleCle();
        await demander();
        setStatut(m.perime);
        return;
      }
      cleConfirmation.current = nouvelleCle();
      setApercu(null);
      setStatut(m.enregistre);
      await client.invalidateQueries({ queryKey: ['lecture', '/profil'] });
    });
  const changer = (maj: (v: string) => void) => (e: { target: { value: string } }) => {
    maj(e.target.value);
    setApercu(null);
    cleApercu.current = nouvelleCle();
  };

  return (
    <section aria-label={e45.boutons.modifier + ' : ' + intitule(cle)}>
      <p>{e45.principe}</p>
      <label>{m.valeur}<input value={valeur} onChange={changer(setValeur)} /></label>
      <label>{m.dateEffet}<input value={date} onChange={changer(setDate)} /></label>
      {erreur ? <p role="alert" tabIndex={-1} ref={alerte}>{erreur}</p> : null}
      {statut ? <p role="status">{statut}</p> : null}
      {apercu ? (
        <ul aria-label={e45.boutons.voirEffet}>
          <li>{m.brouillons + ' : ' + apercu.brouillonsRecalcules}</li>
          <li>{m.declarations + ' : ' + (apercu.declarationsRecalculees.map((d) => m.periode + ' ' + d.debut + ' → ' + d.fin).join(', ') || '0')}</li>
          <li>{m.echeances + ' : ' + apercu.echeancesDeplacees.length}</li>
          <li>{m.aucuneEcriture}</li>
        </ul>
      ) : null}
      <button type="button" disabled={envoi} onClick={() => void voirEffet()}>{envoi ? m.envoi : e45.boutons.voirEffet}</button>
      {apercu ? <button type="button" disabled={envoi} onClick={() => void confirmer()}>{e45.boutons.confirmer}</button> : null}
      <button type="button" onClick={surFermer}>{m.fermer}</button>
    </section>
  );
}
