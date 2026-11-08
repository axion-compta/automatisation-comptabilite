import { oc } from '@orpc/contract';
import { z } from 'zod';
import { EnTeteEcriture } from '../schemas.js';

export const DocumentAAccepter = z.object({
  type: z.string().min(1),
  version: z.number().int().min(1),
  approuve_le: z.iso.datetime({ offset: true }),
  empreinte: z.string().regex(/^[0-9a-f]{64}$/),
  sources: z.array(z.string()),
});

export const listerDocumentsAAccepter = oc
  .route({ method: 'GET', path: '/documents-contractuels/a-accepter', inputStructure: 'detailed', operationId: 'listerDocumentsAAccepter', tags: ['acces:compte'] })
  .input(z.object({}))
  .output(z.object({ body: z.array(DocumentAAccepter) }));

export const enregistrerAcceptation = oc
  .route({ method: 'POST', path: '/acceptations', successStatus: 201, inputStructure: 'detailed', operationId: 'enregistrerAcceptation', tags: ['acces:compte'] })
  .errors({ VERSION_PERIMEE: { status: 409 }, DOCUMENT_ABSENT: { status: 404 } })
  .input(z.object({ headers: EnTeteEcriture, body: z.object({ type: z.string().min(1), version: z.number().int().min(1) }) }))
  .output(z.object({ type: z.string(), version: z.number().int(), accepte_le: z.iso.datetime({ offset: true }) }));

export const acceptations = { listerDocumentsAAccepter, enregistrerAcceptation };
