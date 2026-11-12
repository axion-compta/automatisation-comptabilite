// Adaptateur du port Antivirus vers le service d'analyse (interface seulement, aucun service réel).
// Toute situation douteuse donne « indetermine » : jamais « sain » par défaut.
import type { Antivirus, VerdictAntivirus } from '../ports.js';

export interface ServiceAnalyse { analyser(octets: Uint8Array, signal: AbortSignal): Promise<unknown> }

function verdictValide(reponse: unknown): VerdictAntivirus {
  return reponse === 'sain' || reponse === 'infecte' ? reponse : 'indetermine';
}

export class AntivirusService implements Antivirus {
  constructor(private readonly service: ServiceAnalyse | null | undefined, private readonly delaiMs: number) {}

  async analyser(octets: Uint8Array): Promise<VerdictAntivirus> {
    if (!this.service || !Number.isFinite(this.delaiMs) || this.delaiMs <= 0) return 'indetermine';
    const controle = new AbortController();
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    const delai = new Promise<unknown>((resolve) => {
      minuterie = setTimeout(() => { controle.abort(); resolve(undefined); }, this.delaiMs);
    });
    try {
      return verdictValide(await Promise.race([this.service.analyser(octets.slice(), controle.signal), delai]));
    } catch {
      return 'indetermine';
    } finally {
      clearTimeout(minuterie);
    }
  }
}
