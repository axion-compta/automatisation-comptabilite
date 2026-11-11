// @vitest-environment jsdom
// Fiche L05-T60 : tests nommés transcription-editable, oui-avant-recapitulatif-ignore, audio-jamais-ecrit, segment-trop-long-refuse.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dictee, decouperNombres, type LibellesDictee } from '../Dictee.js';
import { creerFauxTranscription, transcrire } from '../../../../serveur/src/voix/transcription.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const L: LibellesDictee = { dicter: 'L-dicter', envoyer: 'L-envoyer', zone: 'L-zone', trop_long: 'L-trop-long', oui_ignore: 'L-oui-ignore', erreur: 'L-erreur' };
let racine: Root | null = null;
afterEach(() => (act(() => racine?.unmount()), (document.body.innerHTML = '')));

const monter = (dureeMs: number, textes: string[], recapitulatifLu = false) => {
  const segments: Array<{ octets: Uint8Array; dureeMs: number }> = [];
  const envoyer = vi.fn();
  const faux = creerFauxTranscription(textes);
  const capturer = async () => {
    const s = { octets: Uint8Array.from([9, 9]), dureeMs };
    segments.push(s);
    return s;
  };
  const div = document.body.appendChild(document.createElement('div'));
  racine = createRoot(div);
  act(() => racine!.render(<Dictee libelles={L} capturer={capturer} transcrire={(s) => transcrire(faux, s)} envoyer={envoyer} recapitulatifLu={recapitulatifLu} />));
  return { div, segments, envoyer };
};
const bouton = (div: HTMLElement, libelle: string) => [...div.querySelectorAll('button')].find((b) => b.textContent === libelle)!;
const zone = (div: HTMLElement) => div.querySelector('textarea')!;
const cliquer = async (b: HTMLElement) => act(async () => b.dispatchEvent(new MouseEvent('click', { bubbles: true })));
const saisir = (div: HTMLElement, valeur: string) => act(() => {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(zone(div), valeur);
  zone(div).dispatchEvent(new Event('input', { bubbles: true }));
});

describe('Dictee', () => {
  it('transcription-editable : normalisée, nombres surlignés, modifiable avant envoi', async () => {
    const { div, envoyer } = monter(3000, ['payé 12.50 euros']);
    await cliquer(bouton(div, L.dicter));
    expect(zone(div).value).toBe('payé 12,50 euros');
    expect([...div.querySelectorAll('mark')].map((m) => m.textContent)).toEqual(['12,50']);
    saisir(div, 'payé 13 euros');
    await cliquer(bouton(div, L.envoyer));
    expect(envoyer).toHaveBeenCalledWith('payé 13 euros');
  });

  it('audio-jamais-ecrit : le segment est effacé après transcription', async () => {
    const { div, segments } = monter(3000, ['bonjour']);
    await cliquer(bouton(div, L.dicter));
    expect([...segments[0]!.octets]).toEqual([0, 0]);
  });

  it('segment-trop-long-refuse : message affiché, rien dans la zone', async () => {
    const { div, segments } = monter(60_000, ['bonjour']);
    await cliquer(bouton(div, L.dicter));
    expect(div.querySelector('[role=status]')?.textContent).toBe(L.trop_long);
    expect(zone(div).value).toBe('');
    expect([...segments[0]!.octets]).toEqual([0, 0]);
  });

  it('oui-avant-recapitulatif-ignore : A2-05', async () => {
    const avant = monter(3000, ['oui']);
    await cliquer(bouton(avant.div, L.dicter));
    await cliquer(bouton(avant.div, L.envoyer));
    expect(avant.envoyer).not.toHaveBeenCalled();
    expect(avant.div.querySelector('[role=status]')?.textContent).toBe(L.oui_ignore);
    act(() => racine?.unmount());
    const apres = monter(3000, ['oui'], true);
    await cliquer(bouton(apres.div, L.dicter));
    await cliquer(bouton(apres.div, L.envoyer));
    expect(apres.envoyer).toHaveBeenCalledWith('oui');
  });

  it('découpe les nombres', () => expect(decouperNombres('a 12,5 b 3')).toEqual(['a ', '12,5', ' b ', '3', '']));
});
