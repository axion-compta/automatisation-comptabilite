import { createHash } from 'node:crypto';
import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceExports, ErreurExport, type ServiceExportsComplet } from '../../../../packages/contrat/src/domaines/exports-service.js';

/** Le branchement commun (app.ts) passe `{}` par défaut : dans ce cas, un service en mémoire neuf est créé. */
export type ServiceExports = Partial<ServiceExportsComplet>;
const empreinteNode = async (octets: Uint8Array): Promise<string> => createHash('sha256').update(octets).digest('hex');

/** Route d'export, branchée sur le service en mémoire ; l'empreinte vient de `node:crypto`. */
export function routesExports(fourni: ServiceExports = {}) {
  const service = typeof fourni.exporter === 'function' ? (fourni as ServiceExportsComplet) : creerServiceExports({ empreinte: empreinteNode });
  const os = implement(contrat.exports);
  return {
    exporter: os.exporter.handler(async ({ input, errors }) => {
      try {
        return await service.exporter(input.headers['idempotency-key'], input.body);
      } catch (e) {
        if (!(e instanceof ErreurExport)) throw e;
        const fabriques = { liste_non_exportable: errors.LISTE_NON_EXPORTABLE, filtre_invalide: errors.FILTRE_INVALIDE, export_trop_gros: errors.EXPORT_TROP_GROS, export_en_tache_a_venir: errors.EXPORT_EN_TACHE_A_VENIR };
        throw fabriques[e.code]();
      }
    }),
  };
}
