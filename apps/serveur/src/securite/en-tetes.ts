import type { FastifyInstance } from 'fastify';
import type { OptionsSecurite } from './index.js';

export const nom = 'en-tetes';

/** Durée HSTS en secondes (un an, réglage de sécurité et non valeur légale). */
const HSTS_SECONDES = 31536000;
const ORIGINE_HTTPS = /^https:\/\/[^\s;,'"]+$/;
const CORPS_400 = { defined: false, code: 'BAD_REQUEST', status: 400, message: 'Input validation failed' };

function ancetres(options: OptionsSecurite): string {
  const brut = options['ancetresPermis'];
  if (brut === undefined) return "'none'";
  if (!Array.isArray(brut)) throw new Error('ancetresPermis : liste attendue');
  for (const o of brut) {
    if (typeof o !== 'string' || !ORIGINE_HTTPS.test(o)) throw new Error('ancetresPermis : origine https invalide');
  }
  return brut.length === 0 ? "'none'" : (brut as string[]).join(' ');
}

/** Garde seulement les codes d'erreur : ni valeur reçue, ni chemin, ni message de l'analyseur. */
function sansEcho(charge: unknown): string {
  let codes: string[] = [];
  try {
    const issues = (JSON.parse(String(charge)) as { data?: { issues?: unknown } }).data?.issues;
    if (Array.isArray(issues)) codes = issues.map((i) => String((i as { code?: unknown })?.code ?? 'invalid')).filter((c) => /^[a-z_]{1,40}$/.test(c));
  } catch {
    // corps non JSON : on ne garde rien
  }
  return JSON.stringify(codes.length === 0 ? CORPS_400 : { ...CORPS_400, data: { issues: codes.map((code) => ({ code })) } });
}

export function installer(app: FastifyInstance, options: OptionsSecurite): void {
  const csp = `default-src 'none'; frame-ancestors ${ancetres(options)}`;
  app.addHook('onSend', async (_request, reply, charge) => {
    reply.header('content-security-policy', csp);
    reply.header('x-content-type-options', 'nosniff');
    reply.header('referrer-policy', 'no-referrer');
    reply.header('strict-transport-security', `max-age=${HSTS_SECONDES}`);
    reply.header('cross-origin-opener-policy', 'same-origin');
    reply.header('cache-control', 'no-store');
    if (reply.statusCode !== 400) return charge;
    reply.removeHeader('content-length');
    reply.header('content-type', 'application/json; charset=utf-8');
    return sansEcho(charge);
  });
}
