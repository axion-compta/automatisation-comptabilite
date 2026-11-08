// garde:fictif : données fictives seulement (V3-PRI-017).
// Rouge si un fichier suivi contient une adresse e-mail hors @exemple.fr, un IBAN au format valide, un SIREN hors liste blanche (données de test) ou un montant de tarif.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const EMAIL = /[A-Za-z0-9._%+-]{1,64}@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})/g;
// Séparateurs admis (bornés à 3 de suite) : blancs dont insécables, espaces de largeur nulle, point, barre, tiret.
const SEP = '[\\s\\u200B\\u2060\\uFEFF./-]';
// Candidat : 2 lettres, 2 chiffres (séparateur admis entre pays et clé), puis 11 à 30 caractères alphanumériques.
const IBAN = new RegExp(`(?<![A-Z0-9])[A-Z]{2}${SEP}{0,3}\\d{2}(?:${SEP}{0,3}[A-Z0-9]){11,30}`, 'gi');
const SEPARATEURS = new RegExp(SEP, 'g');

// Longueur exacte d'un IBAN par pays : un candidat n'est un IBAN que si le pays est connu et la longueur exacte.
export const LONGUEURS_IBAN = Object.fromEntries(
  'AD24 AE23 AL28 AT20 AZ28 BA20 BE16 BG22 BH22 BR29 BY28 CH21 CR22 CY28 CZ24 DE22 DK18 DO28 EE20 EG29 ES24 FI18 FO18 FR27 GB22 GE22 GI23 GL18 GR27 GT28 HR21 HU28 IE22 IL23 IQ23 IS26 IT27 JO30 KW30 KZ20 LB28 LC32 LI21 LT20 LU20 LV21 MC27 MD24 ME22 MK19 MR27 MT31 MU30 NL18 NO15 PK24 PL28 PS29 PT25 QA29 RO24 RS22 SA24 SC31 SE24 SI19 SK24 SM27 ST25 SV28 TL23 TN24 TR26 UA29 VA22 VG24 XK20 BI27 DJ27 FK18 HN28 LY25 MN20 NI28 OM23 RU33 SD18 SO23 YE30 AO25 BF28 BJ28 CF27 CG27 CI28 CM27 CV25 DZ26 GA27 GQ27 GW25 IR26 KM27 MA28 MG27 ML28 MZ25 NE28 SN28 TD27 TG28'
    .split(' ')
    .map((x) => [x.slice(0, 2), Number(x.slice(2))]),
);

// Valide un IBAN compact en majuscules : pays connu, longueur exacte, clé de contrôle (modulo 97).
export function ibanValide(s) {
  if (LONGUEURS_IBAN[s.slice(0, 2)] !== s.length) return false;
  const r = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let reste = 0;
  for (const ch of r) reste = (reste * 10 + Number(ch)) % 97;
  return reste === 1;
}

export const SIREN_PERMIS = ['123456782', '987654324'];
// Clé de Luhn d'une chaîne de chiffres seulement (vide ou autre caractère : faux).
export function luhnValide(chiffres) {
  if (typeof chiffres !== 'string' || !/^\d+$/.test(chiffres)) return false;
  let somme = 0;
  [...chiffres].reverse().forEach((c, i) => {
    const n = Number(c) * (i % 2 === 1 ? 2 : 1);
    somme += n > 9 ? n - 9 : n;
  });
  return somme % 10 === 0;
}
const SIREN = /(?<![0-9A-Za-z.,_])\d{9}(?![0-9A-Za-z.,_])/g;
const TARIF = /\d(?:\s*(?:€|HT|TTC))+\s*\/\s*(?:mois|an)(?![A-Za-z])/i;
const DONNEES_DE_TEST = /\/__tests__\/|\.test\.|\.spec\.|\/e2e\/|(^|\/)packages\/donnees-fictives\//;
const SIREN_EXCLUS = /(^|\/)(pnpm-lock\.yaml|openapi\.json)$/;
const TARIF_EXEMPTES = /^outils\/gardes\/(fictif\.mjs|test\/)/;

export function analyserTexte(texte, nom) {
  const pb = [];
  const sirenActif = DONNEES_DE_TEST.test('/' + nom) && !SIREN_EXCLUS.test(nom);
  const tarifActif = !TARIF_EXEMPTES.test(nom);
  texte.split(/\r?\n/).forEach((l, i) => {
    if (sirenActif) {
      for (const m of l.matchAll(SIREN)) {
        if (luhnValide(m[0]) && !SIREN_PERMIS.includes(m[0])) pb.push(`${nom}:${i + 1} SIREN hors liste blanche : ${m[0]}`);
      }
    }
    if (tarifActif && TARIF.test(l)) pb.push(`${nom}:${i + 1} montant de tarif : ${l.trim().slice(0, 60)}`);
    for (const m of l.matchAll(EMAIL)) {
      if (m[1].toLowerCase() !== 'exemple.fr') pb.push(`${nom}:${i + 1} e-mail hors @exemple.fr : ${m[0]}`);
    }
    // Ligne décodée (%20, %C2%A0 et + = espaces ; %2D, %2F, %2E = - / .). Un candidat rejeté ne masque pas la suite : reprise juste après son premier caractère.
    const d = l
      .replace(/%(?:20|C2%A0)/gi, ' ')
      .replace(/\+/g, ' ')
      .replace(/%2D/gi, '-')
      .replace(/%2F/gi, '/')
      .replace(/%2E/gi, '.');
    const re = new RegExp(IBAN.source, 'gi');
    let m;
    while ((m = re.exec(d))) {
      const s = m[0].replace(SEPARATEURS, '').toUpperCase();
      const n = LONGUEURS_IBAN[s.slice(0, 2)];
      // Fin du candidat : indice après le n-ième caractère alphanumérique (la prose qui suit n'en fait pas partie).
      let fin = 0;
      if (n) {
        for (let vus = 0; vus < n; ) if (/[A-Za-z0-9]/.test(m[0][fin++])) vus++;
      }
      // Prose française : un candidat avec minuscules doit avoir au moins la moitié de chiffres dans le BBAN.
      const bban = s.slice(4, n);
      const prose = n && /[a-z]/.test(m[0].slice(0, fin)) && (bban.match(/\d/g) ?? []).length * 2 < bban.length;
      if (n && !prose && ibanValide(s.slice(0, n))) {
        pb.push(`${nom}:${i + 1} IBAN au format valide interdit`);
        re.lastIndex = m.index + fin;
      } else re.lastIndex = m.index + 1;
    }
  });
  return pb;
}

const IGNORES = /(^|\/)(pnpm-lock\.yaml|node_modules\/.*)$/;
// Binaires et bureautique : jamais analysables. Admis seulement sous DOSSIERS_PDF_FICTIFS (fichiers fictifs, non analysés).
const BINAIRE = /\.(pdf|avif|heic|mp4|mp3|xz|bz2|sqlite|wasm|xlsx?|xlsm|docx?|pptx?|odt|ods|odp|zip|7z|rar|gz|tgz|tar|png|jpe?g|gif|webp|bmp|tiff?|ico|woff2?|ttf|otf|eot)$/i;
export const DOSSIERS_PDF_FICTIFS = ['packages/donnees-fictives/'];

function gitReel(args, cwd) {
  const r = spawnSync('git', args, { encoding: 'utf8', cwd, maxBuffer: 1 << 28 });
  return r.status === 0 ? r.stdout : null;
}

// git : (args, cwd) => sortie ou null si échec ; lire : (chemin absolu) => texte.
export function analyserDepot(git = gitReel, lire = (f) => readFileSync(f, 'utf8')) {
  const racine = git(['rev-parse', '--show-toplevel'])?.trim();
  if (!racine) return ['git rev-parse --show-toplevel a échoué : dépôt non analysé'];
  const liste = git(['ls-files', '-z'], racine);
  if (liste === null) return ['git ls-files a échoué : dépôt non analysé'];
  const pb = [];
  for (const f of liste.split('\0').filter((x) => x && !IGNORES.test(x))) {
    if (BINAIRE.test(f)) {
      if (!DOSSIERS_PDF_FICTIFS.some((d) => f.startsWith(d))) pb.push(`${f} ${/\.pdf$/i.test(f) ? 'PDF' : 'binaire'} suivi hors dossier fictif (non analysable)`);
      continue;
    }
    try {
      const texte = lire(`${racine}/${f}`);
      if (texte.includes('\0')) pb.push(`${f} binaire non reconnu (octet NUL)`);
      else pb.push(...analyserTexte(texte, f));
    } catch (e) {
      pb.push(`${f} illisible : ${e.code ?? e.message}`);
    }
  }
  return pb;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const pb = analyserDepot();
  if (pb.length > 0) {
    console.error('garde:fictif ROUGE\n' + pb.map((p) => ' - ' + p).join('\n'));
    process.exit(1);
  }
  console.log('garde:fictif vert');
}
