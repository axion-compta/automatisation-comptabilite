// Statut de période d'une pièce, calculé d'après les dates de la société (fin d'exercice incluse).
import { ErreurPiece, type StatutPeriode } from '../types.js';

export interface DatesSociete { depotStatuts?: string | undefined; immatriculation?: string | undefined; exercices: { id: string; debut: string; fin: string }[]; }
export interface ResultatPeriode { statut: StatutPeriode; exerciceId?: string; anterieure: boolean; }

function valider(d: unknown): string {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [an, mois, jour] = d.split('-').map(Number) as [number, number, number];
    const t = new Date(Date.UTC(an, mois - 1, jour));
    if (t.getUTCFullYear() === an && t.getUTCMonth() === mois - 1 && t.getUTCDate() === jour) return d;
  }
  throw new ErreurPiece('dates_invalides', 'Date invalide : format AAAA-MM-JJ et jour réel attendus.');
}

function exercicesValides(dates: DatesSociete): { id: string; debut: string; fin: string }[] {
  const tries = dates.exercices.map((e) => ({ id: e.id, debut: valider(e.debut), fin: valider(e.fin) })).sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : 0));
  tries.forEach((e, i) => {
    if (e.debut > e.fin) throw new ErreurPiece('dates_invalides', 'Un exercice commence après sa fin.');
    const precedent = tries[i - 1];
    if (precedent !== undefined && e.debut <= precedent.fin) throw new ErreurPiece('dates_invalides', 'Des exercices se chevauchent.');
  });
  return tries;
}

export function statutPeriode(datePiece: string, dates: DatesSociete): ResultatPeriode {
  const date = valider(datePiece);
  const depot = dates.depotStatuts === undefined ? undefined : valider(dates.depotStatuts);
  const immat = dates.immatriculation === undefined ? undefined : valider(dates.immatriculation);
  const exercices = exercicesValides(dates);
  const dedans = exercices.find((e) => date >= e.debut && date <= e.fin);
  if (dedans !== undefined) return { statut: 'dans_exercice', exerciceId: dedans.id, anterieure: false };
  const premier = exercices[0];
  const anterieure = premier !== undefined && date < premier.debut;
  if (depot !== undefined && date < depot) return { statut: 'avant_depot', anterieure };
  if (immat !== undefined && date < immat) return { statut: 'formation', anterieure };
  if (anterieure) return { statut: 'entre_immatriculation_et_exercice', anterieure };
  return { statut: 'hors_exercice', anterieure };
}
