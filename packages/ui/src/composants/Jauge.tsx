export interface JaugeProps {
  valeur: number;
  maximum: number;
  libelle: string;
  texteValeur: string;
  estimation?: string;
}

function entierPositif(n: number): boolean {
  return Number.isInteger(n) && n >= 0;
}

/** Jauge accessible : le dépassement est dit par un attribut et un motif, jamais par la couleur seule. */
export function Jauge({ valeur, maximum, libelle, texteValeur, estimation }: JaugeProps) {
  const valide = entierPositif(valeur) && Number.isInteger(maximum) && maximum > 0;
  if (!valide) {
    return (
      <div className="axion-jauge">
        <span className="axion-jauge__texte">{texteValeur}</span>
      </div>
    );
  }
  const pourcentage = Math.min(100, Math.floor((valeur * 100) / maximum));
  const depasse = valeur > maximum;
  return (
    <div className="axion-jauge">
      <div
        className="axion-jauge__meter"
        role="meter"
        aria-label={libelle}
        aria-valuemin={0}
        aria-valuemax={maximum}
        aria-valuenow={Math.min(valeur, maximum)}
        aria-valuetext={texteValeur}
        data-depasse={depasse ? 'oui' : undefined}
      >
        <div className="axion-jauge__piste">
          <div className="axion-jauge__barre" data-barre="" style={{ width: `${pourcentage}%` }} />
        </div>
      </div>
      <span className="axion-jauge__texte">{texteValeur}</span>
      {estimation ? (
        <span className="axion-jauge__estimation" data-estimation="">
          {estimation}
        </span>
      ) : null}
    </div>
  );
}
