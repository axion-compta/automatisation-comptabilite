// Générateur de données fictives v1 à graine fixe (V3-DEM-004). Aucune donnée réelle (V3-PRI-017).
export const GRAINE = 20260101;

export type Profil = 'pleine' | 'vide' | 'en_formation' | 'franchise' | 'micro' | 'tva_encaissements' | 'charge';

export interface FactureFictive {
  numero: string;
  date: string;
  client: string;
  ht_centimes: number;
  tva_centimes: number;
}

export interface SocieteFictive {
  profil: Profil;
  nom: string;
  siren: string | null;
  devise: 'XXA' | 'XXB' | 'XXC' | 'XXD';
  email: string;
  regime_tva: 'reel_normal' | 'franchise_en_base' | 'encaissements' | 'aucun';
  factures: FactureFictive[];
}

export interface JeuDonnees {
  version: 1;
  graine: number;
  societes: SocieteFictive[];
}

// Générateur pseudo-aléatoire mulberry32 : même graine, même suite.
export function creerAlea(graine: number): () => number {
  let etat = graine >>> 0;
  return () => {
    etat = (etat + 0x6d2b79f5) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Clé de Luhn d'un SIREN à 9 chiffres.
export function sirenValide(siren: string): boolean {
  if (!/^\d{9}$/.test(siren)) return false;
  let somme = 0;
  for (let i = 0; i < 9; i++) {
    let c = Number(siren[8 - i]);
    if (i % 2 === 1) {
      c *= 2;
      if (c > 9) c -= 9;
    }
    somme += c;
  }
  return somme % 10 === 0;
}

interface Plan {
  profil: Profil;
  nom: string;
  siren: string | null;
  devise: SocieteFictive['devise'];
  courriel: string;
  regime: SocieteFictive['regime_tva'];
  nbFactures: number;
  tauxTva: number;
}

const CLIENTS = ['Atelier Bertin', 'Garage Fontaine', 'Boulangerie Rivoire', 'Immobilière Marceau', 'Lemoine Rénovation'];

const PLANS: Plan[] = [
  { profil: 'pleine', nom: 'Lemoine Rénovation', siren: '123456782', devise: 'XXA', courriel: 'contact@exemple.fr', regime: 'reel_normal', nbFactures: 12, tauxTva: 20 },
  { profil: 'vide', nom: 'Immobilière Marceau', siren: '987654324', devise: 'XXB', courriel: 'accueil@exemple.fr', regime: 'reel_normal', nbFactures: 0, tauxTva: 20 },
  { profil: 'en_formation', nom: 'Atelier Bertin', siren: null, devise: 'XXA', courriel: 'creation@exemple.fr', regime: 'aucun', nbFactures: 0, tauxTva: 0 },
  { profil: 'franchise', nom: 'Garage Fontaine', siren: '123456782', devise: 'XXC', courriel: 'services@exemple.fr', regime: 'franchise_en_base', nbFactures: 8, tauxTva: 0 },
  { profil: 'micro', nom: 'Boulangerie Rivoire', siren: '987654324', devise: 'XXD', courriel: 'micro@exemple.fr', regime: 'franchise_en_base', nbFactures: 6, tauxTva: 0 },
  { profil: 'tva_encaissements', nom: 'Lemoine Rénovation', siren: '987654324', devise: 'XXB', courriel: 'sud@exemple.fr', regime: 'encaissements', nbFactures: 10, tauxTva: 10 },
  { profil: 'charge', nom: 'Garage Fontaine', siren: '987654324', devise: 'XXA', courriel: 'charge@exemple.fr', regime: 'reel_normal', nbFactures: 60, tauxTva: 20 },
];

export function genererDonnees(graine: number = GRAINE): JeuDonnees {
  const alea = creerAlea(graine);
  const entier = (min: number, max: number) => min + Math.floor(alea() * (max - min + 1));
  const societes = PLANS.map((p): SocieteFictive => {
    const clients = CLIENTS.filter((c) => c !== p.nom);
    const tirees: Omit<FactureFictive, 'numero'>[] = [];
    for (let i = 0; i < p.nbFactures; i++) {
      const ht = entier(50, 5000) * 100 + entier(0, 99);
      const jour = String(entier(1, 28)).padStart(2, '0');
      const mois = String(entier(1, 12)).padStart(2, '0');
      tirees.push({
        date: `2025-${mois}-${jour}`,
        client: clients[entier(0, clients.length - 1)] as string,
        ht_centimes: ht,
        tva_centimes: Math.round((ht * p.tauxTva) / 100),
      });
    }
    // Tri stable par date (égalité : ordre de tirage), puis numérotation continue.
    tirees.sort((x, y) => x.date.localeCompare(y.date));
    const factures: FactureFictive[] = tirees.map((t, i) => ({
      numero: `${p.profil.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(4, '0')}`,
      ...t,
    }));
    return { profil: p.profil, nom: p.nom, siren: p.siren, devise: p.devise, email: p.courriel, regime_tva: p.regime, factures };
  });
  return { version: 1, graine, societes };
}

// Sérialisation stable : une société par bloc, une facture par ligne.
export function serialiser(jeu: JeuDonnees): string {
  const bloc = (s: SocieteFictive) => {
    const { factures, ...entete } = s;
    const lignes = factures.map((f) => '      ' + JSON.stringify(f));
    const fact = lignes.length ? `[\n${lignes.join(',\n')}\n    ]` : '[]';
    return `    {\n      "entete": ${JSON.stringify(entete)},\n      "factures": ${fact}\n    }`;
  };
  return `{\n  "version": ${jeu.version},\n  "graine": ${jeu.graine},\n  "societes": [\n${jeu.societes.map(bloc).join(',\n')}\n  ]\n}\n`;
}
