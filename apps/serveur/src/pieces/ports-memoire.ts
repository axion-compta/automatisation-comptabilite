// Implémentations en mémoire des ports, pour les tests : aucun réseau, aucune donnée réelle.
import type { Antivirus, DepotPiecesEnregistrees, Horloge, PieceEnregistree, StockagePieces, VerdictAntivirus } from './ports.js';
import { sha256Hex } from './etape-entree.js';

export class AntivirusMemoire implements Antivirus {
  private readonly verdicts = new Map<string, VerdictAntivirus>();
  programmer(sha256: string, verdict: VerdictAntivirus): void { this.verdicts.set(sha256, verdict); }
  async analyser(octets: Uint8Array): Promise<VerdictAntivirus> { return this.verdicts.get(sha256Hex(octets)) ?? 'sain'; }
}
export class StockageMemoire implements StockagePieces {
  private readonly objets = new Map<string, Uint8Array>();
  async deposerSiAbsent(cle: string, octets: Uint8Array): Promise<'depose' | 'existe'> {
    const existe = this.objets.has(cle);
    if (!existe) this.objets.set(cle, octets.slice());
    return existe ? 'existe' : 'depose';
  }
  async lire(cle: string): Promise<Uint8Array | null> { return this.objets.get(cle) ?? null; }
  taille(): number { return this.objets.size; }
}
export class HorlogeFixe implements Horloge {
  constructor(private readonly instant: string) {}
  maintenant(): string { return this.instant; }
}
export class DepotMemoire implements DepotPiecesEnregistrees {
  private readonly pieces = new Map<string, PieceEnregistree>();
  async parId(id: string): Promise<PieceEnregistree | null> { return this.pieces.get(id) ?? null; }
  async parSha256(societeId: string, sha256: string): Promise<PieceEnregistree[]> { return [...this.pieces.values()].filter((p) => p.societeId === societeId && p.sha256 === sha256); }
  async enregistrer(piece: PieceEnregistree): Promise<void> { this.pieces.set(piece.id, { ...piece }); }
  nombre(): number { return this.pieces.size; }
}
