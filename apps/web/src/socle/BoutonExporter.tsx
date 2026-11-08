import { useRef, useState } from 'react';
import { exporter, ErreurExporter, type CodeErreurExporter, type FiltresExport, type FormatExport } from '../donnees/exporter.js';

export type TextesExport = {
  bouton: string;
  enCours: string;
  choix: string;
  csv: string;
  xlsx: string;
  erreurs: Record<CodeErreurExporter, string>;
};
type Props = { liste: string; filtres: FiltresExport; textes: TextesExport };

/** Bouton « Exporter » : choix CSV ou XLSX, une seule requête à la fois, message par code d'erreur. */
export function BoutonExporter({ liste, filtres, textes }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<CodeErreurExporter | null>(null);
  const verrou = useRef(false);
  async function lancer(format: FormatExport) {
    if (verrou.current) return;
    verrou.current = true;
    setOuvert(false);
    setErreur(null);
    setEnCours(true);
    try {
      await exporter(liste, format, filtres);
    } catch (e) {
      setErreur(e instanceof ErreurExporter ? e.code : 'autre');
    } finally {
      verrou.current = false;
      setEnCours(false);
    }
  }
  return (
    <div>
      <button type="button" aria-haspopup="true" aria-expanded={ouvert} aria-busy={enCours} disabled={enCours} onClick={() => setOuvert(!ouvert)}>
        {enCours ? textes.enCours : textes.bouton}
      </button>
      {ouvert && (
        <div role="group" aria-label={textes.choix}>
          <button type="button" onClick={() => void lancer('csv')}>{textes.csv}</button>
          <button type="button" onClick={() => void lancer('xlsx')}>{textes.xlsx}</button>
        </div>
      )}
      {erreur && <p role="alert">{textes.erreurs[erreur]}</p>}
    </div>
  );
}
