// Fiche L05-T60 : dictée par segments courts ; transcription éditable avant envoi, nombres surlignés.
// Les libellés, la capture, la transcription et l'envoi sont reçus en argument (faux dans les tests, texte venu de packages/textes).
import { useState } from 'react';
import { accepterOui, estOuiSeul, normaliser, type SegmentAudio } from '../../../serveur/src/voix/transcription.js';

export type LibellesDictee = { dicter: string; envoyer: string; zone: string; trop_long: string; oui_ignore: string; erreur: string };
export type PropsDictee = {
  libelles: LibellesDictee;
  capturer: () => Promise<SegmentAudio>;
  transcrire: (segment: SegmentAudio) => Promise<string>;
  envoyer: (texte: string) => void;
  recapitulatifLu: boolean;
};

const NOMBRES = /(\d+(?:[ ,]\d+)*)/g;
/** Découpe le texte en morceaux ; les indices impairs sont les nombres à surligner. */
export const decouperNombres = (texte: string): string[] => texte.split(NOMBRES);

export function Dictee({ libelles, capturer, transcrire, envoyer, recapitulatifLu }: PropsDictee) {
  const [texte, setTexte] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const dicter = async () => {
    setMessage(null);
    let segment: SegmentAudio | null = null;
    try {
      segment = await capturer();
      const resultat = await transcrire(segment);
      setTexte((avant) => normaliser(`${avant} ${resultat}`));
    } catch (e) {
      setMessage((e as Error).message === 'segment_trop_long' ? libelles.trop_long : libelles.erreur);
    } finally {
      segment?.octets.fill(0);
    }
  };
  const valider = () => {
    if (texte === '') return;
    if (estOuiSeul(texte) && !accepterOui(texte, recapitulatifLu)) return setMessage(libelles.oui_ignore);
    envoyer(texte);
    setTexte('');
  };
  return (
    <div className="axion-dictee">
      <button type="button" onClick={() => void dicter()}>{libelles.dicter}</button>
      <textarea aria-label={libelles.zone} value={texte} onChange={(e) => setTexte(e.target.value)} />
      <p>{decouperNombres(texte).map((m, i) => (i % 2 === 1 ? <mark key={i}>{m}</mark> : m))}</p>
      {message !== null && <p role="status">{message}</p>}
      <button type="button" onClick={valider}>{libelles.envoyer}</button>
    </div>
  );
}
