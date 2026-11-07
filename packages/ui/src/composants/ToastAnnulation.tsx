import { useEffect, useRef, useState } from "react";

export interface ToastAnnulationProps {
  dureeMs: number;
  libelleAnnuler: string;
  texteRestant: (secondes: number) => string;
  onAnnuler: () => void;
  onFin: () => void;
  maintenant?: () => number;
}

const PAS_MS = 250;
const SEUIL_ANNONCE_S = 3;
const horloge = () => performance.now();

export function ToastAnnulation({ dureeMs, libelleAnnuler, texteRestant, onAnnuler, onFin, maintenant = horloge }: ToastAnnulationProps) {
  const valide = Number.isFinite(dureeMs) && dureeMs > 0;
  const [restant, setRestant] = useState(valide ? dureeMs : 0);
  const [annonce, setAnnonce] = useState(() => (valide ? texteRestant(Math.ceil(dureeMs / 1000)) : ""));
  const [ferme, setFerme] = useState(!valide);
  const pause = useRef({ focus: false, survol: false });
  const fini = useRef(false);
  const annule = useRef(false);
  const rappels = useRef({ onFin, texteRestant, maintenant });
  rappels.current = { onFin, texteRestant, maintenant };

  useEffect(() => {
    if (!valide) {
      if (!fini.current) { fini.current = true; rappels.current.onFin(); }
      return undefined;
    }
    let reste = dureeMs;
    let dernier = rappels.current.maintenant();
    let annonceA3 = false;
    const id = setInterval(() => {
      const t = rappels.current.maintenant();
      if (!pause.current.focus && !pause.current.survol) reste -= t - dernier;
      dernier = t;
      setRestant(Math.max(reste, 0));
      if (!annonceA3 && reste <= SEUIL_ANNONCE_S * 1000 && dureeMs > SEUIL_ANNONCE_S * 1000) { annonceA3 = true; setAnnonce(rappels.current.texteRestant(SEUIL_ANNONCE_S)); }
      if (Math.max(reste, 0) === 0) {
        clearInterval(id);
        setFerme(true);
        if (!fini.current && !annule.current) { fini.current = true; rappels.current.onFin(); }
      }
    }, PAS_MS);
    return () => clearInterval(id);
  }, [dureeMs, valide]);

  if (ferme) return null;

  const annuler = () => {
    if (annule.current || fini.current) return;
    annule.current = true;
    setFerme(true);
    onAnnuler();
  };
  const suspendre = (k: "focus" | "survol", v: boolean) => () => { pause.current[k] = v; };

  return (
    <div className="axion-toast" onMouseEnter={suspendre("survol", true)} onMouseLeave={suspendre("survol", false)} onFocus={suspendre("focus", true)} onBlur={suspendre("focus", false)}>
      <span role="status" className="axion-toast__annonce">{annonce}</span>
      <span aria-hidden="true" className="axion-toast__restant">{texteRestant(Math.ceil(restant / 1000))}</span>
      <button
        type="button"
        className="axion-toast__annuler"
        onClick={annuler}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); annuler(); } }}
      >
        {libelleAnnuler}
      </button>
    </div>
  );
}
