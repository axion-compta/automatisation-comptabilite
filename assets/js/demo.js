/* Démonstration cliquable. Aucune ressource externe, aucune donnée envoyée nulle part.
   Tout ce qui s'affiche ici est fictif et préenregistré. */
(function () {
  'use strict';
  var PAGE = document.body.getAttribute('data-demo-page') || '';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduit = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function stock(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } }

  /* ------------------------------------------------------------ bandeau permanent */
  var bandeau = document.createElement('div');
  bandeau.className = 'demo-bandeau';
  bandeau.setAttribute('role', 'note');
  bandeau.innerHTML = '<strong>Démonstration, données fictives</strong><span class="demo-bandeau-ia">· Préparé par IA, à valider</span>';
  document.body.insertBefore(bandeau, document.body.firstChild);

  /* ------------------------------------------------------------ petit message */
  var toastTimer;
  function toast(msg) {
    var t = $('.demo-toast');
    if (!t) { t = document.createElement('div'); t.className = 'demo-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4500);
  }

  /* ------------------------------------------------------------ téléchargements fictifs (fabriqués ici, en local) */
  function telecharger(nom, contenu, type) {
    var blob = new Blob(['﻿' + contenu], { type: type + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = nom; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 1000);
  }
  var HIST = [
    ['Date', 'Heure', 'Qui', 'Action', 'Pièce d\'origine', 'Pourquoi', 'Confiance', 'Validation'],
    ['DÉMONSTRATION', 'DONNÉES FICTIVES', '', 'Préparé par IA, à valider', '', '', '', ''],
    ['14/10/2026', '11:05', 'Assistant (IA)', 'Écriture préparée', 'Facture AB-1021 du 14/10/2026 (Atelier Bertin)', 'Achat de matériel à Atelier Bertin : 1 000 € hors TVA et 200 € de TVA, soit 1 200 €.', 'Moyenne', 'Pas encore validée par Claire Lemoine'],
    ['14/10/2026', '11:05', 'Assistant (IA)', 'Question posée', 'Facture AB-1021', 'Atelier Bertin est un nouveau fournisseur : le nom est à confirmer.', 'Moyenne', 'En attente'],
    ['07/10/2026', '09:12', 'Assistant (IA)', 'Opération de banque classée', 'Relevé de banque, ligne du 07/10', 'Paiement de 1 000 € : 200 € de moins que la facture, écart signalé.', 'Moyenne', 'En attente'],
    ['17/10/2026', '08:40', 'Assistant (IA)', 'Lien proposé', 'Ticket de restaurant du 17/10', 'Même montant et même date que l\'opération de 64,00 € du 17/10.', 'Élevée', 'En attente'],
    ['21/10/2026', '08:41', 'Assistant (IA)', 'Lien proposé', 'Facture Fournisseur d\'énergie du 20/10', 'Même fournisseur ; montant inhabituel signalé (219,00 €).', 'Moyenne', 'En attente'],
    ['12/11/2026', '09:05', 'Claire Lemoine', 'Lien confirmé', 'Fournisseur de matériaux, 212,40 €', 'Confirmé à la main.', 'Élevée', 'Validé par Claire Lemoine le 12/11/2026']
  ];
  function csv(l) { return l.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(';'); }).join('\r\n'); }
  var FEC = [
    ['JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate', 'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib', 'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit', 'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise'],
    ['AC', 'Achats', '1', '20261014', '606300', 'Petit outillage et matériel', '', '', 'AB-1021', '20261014', 'DEMO fictif - Atelier Bertin - Préparé par IA, à valider', '1000,00', '0,00', '', '', '', '', ''],
    ['AC', 'Achats', '1', '20261014', '445660', 'TVA déductible', '', '', 'AB-1021', '20261014', 'DEMO fictif - Atelier Bertin - TVA 20 %', '200,00', '0,00', '', '', '', '', ''],
    ['AC', 'Achats', '1', '20261014', '401000', 'Fournisseurs', 'BERT', 'Atelier Bertin', 'AB-1021', '20261014', 'DEMO fictif - Atelier Bertin', '0,00', '1200,00', '', '', '', '', ''],
    ['VE', 'Ventes', '2', '20260920', '411000', 'Clients', 'RIVO', 'Boulangerie Rivoire', 'F-2026-031', '20260920', 'DEMO fictif - Facture client Boulangerie Rivoire', '1200,00', '0,00', '', '', '', '', ''],
    ['VE', 'Ventes', '2', '20260920', '706000', 'Prestations de services', '', '', 'F-2026-031', '20260920', 'DEMO fictif - Facture client Boulangerie Rivoire', '0,00', '1000,00', '', '', '', '', ''],
    ['VE', 'Ventes', '2', '20260920', '445710', 'TVA collectée', '', '', 'F-2026-031', '20260920', 'DEMO fictif - TVA 20 %', '0,00', '200,00', '', '', '', '', '']
  ];
  function telecharge(quoi) {
    if (quoi === 'fec') {
      telecharger('FEC-DEMO-fictif.txt', FEC.map(function (r) { return r.join('\t'); }).join('\r\n'), 'text/plain');
      toast('Fichier des écritures (FEC) de démonstration téléchargé. Données fictives : pas un vrai FEC.');
    } else {
      telecharger('historique-DEMO-fictif.csv', csv(HIST), 'text/csv');
      toast("Historique exporté : un fichier lisible, avec pour chaque ligne la pièce, la raison, qui l'a faite et quand.");
    }
  }

  /* ------------------------------------------------------------ états (onglets) */
  function mainEl() { return $('main#contenu') || $('main'); }
  function etat(cle) {
    var tpl = document.getElementById('etat-' + cle);
    var m = mainEl();
    if (!tpl || !m) { toast("Cette vue n'est pas détaillée dans la démonstration."); return; }
    m.innerHTML = tpl.innerHTML;
    if (tpl.getAttribute('data-classe')) m.className = tpl.getAttribute('data-classe');
    m.setAttribute('tabindex', '-1');
    try { m.focus({ preventScroll: true }); } catch (e) { m.focus(); }
    window.scrollTo(0, 0);
    if (cle !== 'base') { try { history.replaceState(null, '', '?e=' + cle); } catch (e) {} } else { try { history.replaceState(null, '', location.pathname); } catch (e) {} }
  }

  /* ------------------------------------------------------------ connexion par code (E10) */
  function montrerCode(instant) {
    var tpl = document.getElementById('tpl-code');
    var carte = $('.rv-connexion-carte');
    if (!tpl || !carte) return;
    var neuf = document.createElement('div');
    neuf.innerHTML = tpl.innerHTML;
    var n = neuf.firstElementChild;
    carte.parentNode.replaceChild(n, carte);
    var champ = $('input.R-code', n);
    if (champ) { try { champ.focus(); } catch (e) {} }
    var form = $('form', n);
    var note = document.createElement('p');
    note.className = 'rv-note';
    note.textContent = 'Démonstration : le code reçu par e-mail est déjà rempli (482 913).';
    if (form) form.insertBefore(note, form.firstChild.nextSibling);
    var renvoi = $$('button[disabled]', n); renvoi.forEach(function (b) { b.setAttribute('aria-disabled', 'true'); });
    var ok = $$('button.btn-plein', n)[0];
    if (ok) { ok.setAttribute('data-vers', 'E56.html'); }
  }

  /* ------------------------------------------------------------ dépôt simulé (E03) */
  var depotFini = false, depotTimer = null, depotFinir = null;
  function lancerDepot(instant) {
    var btn = $('[data-depot]');
    var carte = btn ? btn.closest('.rv-carte, section') : null;
    if (!carte) return;
    var hauteur = carte.offsetHeight;
    var TOTAL = 40;
    carte.style.minHeight = hauteur + 'px';
    carte.removeAttribute('aria-label');
    carte.innerHTML = '<div class="demo-depot" aria-live="polite">' +
      '<p class="demo-depot-fichier">dossier-factures-octobre.zip · 40 fichiers</p>' +
      '<h2 class="demo-depot-titre">Je lis votre dossier…</h2>' +
      '<div class="demo-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Lecture du dossier"><span></span></div>' +
      '<p class="demo-depot-etat">0 fichier sur ' + TOTAL + '</p></div>';
    var barre = $('.demo-prog', carte), rempl = $('.demo-prog > span', carte), etatTxt = $('.demo-depot-etat', carte), titre = $('.demo-depot-titre', carte);
    var n = 0;
    function maj() {
      var p = Math.round(n / TOTAL * 100);
      rempl.style.width = p + '%'; barre.setAttribute('aria-valuenow', p);
      etatTxt.textContent = n + ' fichier' + (n > 1 ? 's' : '') + ' sur ' + TOTAL + (n < 14 ? ' · je lis' : n < 30 ? ' · je classe' : ' · je prépare les liens avec la banque');
    }
    function fin() {
      clearInterval(depotTimer); depotFini = true;
      carte.innerHTML = '<div class="demo-depot" aria-live="polite">' +
        '<p class="demo-depot-fichier">dossier-factures-octobre.zip · 40 fichiers lus</p>' +
        '<div class="demo-depot-resume"><span class="demo-gros">38</span><span class="demo-lib">rangées, 2 à vérifier</span></div>' +
        '<ul class="demo-depot-liste">' +
        '<li>38 factures et tickets d\'achat rangés dans les bons mois, avec 38 liens proposés vers la banque</li>' +
        '<li class="verif">2 à vérifier : Atelier Bertin (nouveau fournisseur, écart de 200 €) et Garage Fontaine (date illisible)</li></ul>' +
        '<p class="rv-note"><span class="r3-mention" data-composant="Statut">' + icone('lu-sparkles') + 'Préparé par IA, à valider</span> Rien n\'est définitif sans votre accord.</p>' +
        '<div class="demo-depot-actions"><a class="btn-plein rv-btn" href="E08.html">Voir les 2 à vérifier</a><a class="btn-texte rv-btn-texte" href="E24.html">Voir ce qui a été rangé</a></div></div>';
      if (window.__demoApresDepot) window.__demoApresDepot();
    }
    depotFinir = function () { n = TOTAL; maj(); fin(); };
    if (instant || reduit) { depotFinir(); return; }
    depotTimer = setInterval(function () { n += 1 + Math.floor(Math.random() * 2); if (n >= TOTAL) { n = TOTAL; maj(); fin(); } else maj(); }, 110);
  }
  function finirDepot() { if (!depotFini && depotFinir) depotFinir(); }

  /* ------------------------------------------------------------ discussion simulée */
  var Q = [
    { cle: 'tva', q: 'Combien je dois de TVA ce mois-ci ?', re: /tva/i,
      r: "<strong>Préparation impossible : il reste 3 pièces à vérifier.</strong> Tant qu'elles ne sont pas vérifiées, je ne vous donne pas de montant de TVA pour octobre. La déclaration est à déposer avant le 24/11/2026 (date à vérifier).",
      carte: { surtitre: 'Il manque des vérifications', titre: 'TVA d\'octobre : 3 pièces à vérifier', note: 'Dès que les 3 pièces sont vérifiées, je prépare la déclaration. Vous la déposez vous-même sur impots.gouv.', bouton: 'Voir les 3 pièces', vers: 'E20.html', lien: ['Voir Mes déclarations', 'E19.html'] } },
    { cle: 'impayes', q: 'Qui me doit de l\'argent ?', re: /doit|impay|retard|rivoire|client/i,
      r: "Un client est en retard : <strong>Boulangerie Rivoire, 1 200 €, 23 jours de retard</strong>. J'ai préparé une relance polie, prête mais non envoyée : elle ne part qu'avec votre accord.",
      carte: { surtitre: 'À valider', titre: 'Relance prête pour Boulangerie Rivoire', note: 'Message poli, avec la facture en pièce jointe. Non envoyé tant que vous ne validez pas.', bouton: 'Envoyer la relance', ok: 'Relance enregistrée (simulation : rien n\'a été envoyé).', lien: ['Voir Mes factures', 'E24.html?e=retard'] } },
    { cle: 'manque', q: 'Qu\'est-ce qui manque pour valider octobre ?', re: /manque|valider/i,
      r: "Il reste <strong>5 choses</strong> avant de valider octobre. La première : le relevé de banque d'octobre, que je n'ai pas encore reçu.",
      carte: { surtitre: 'Il manque un relevé', titre: 'Relevé d\'octobre', note: '', bouton: 'Ajouter le relevé', vers: 'E03.html' } },
    { cle: 'janvier', q: 'Combien aurai-je en banque en janvier ?', re: /janvier|trésorerie|aurai/i,
      r: "Fin janvier, vous auriez <strong>environ 15 200 €</strong> en banque. C'est une estimation, fondée sur vos ventes et vos charges habituelles ; elle change si un client paie en retard.",
      carte: null, lien: ['Voir Ma banque', 'E12.html'] }
  ];
  var AUTRES = [
    { re: /pourquoi.*ventes|ventes.*mont/i, r: "Vos ventes d'octobre sont à <strong>9 830 € hors TVA</strong>, soit 4 % de plus qu'en octobre 2025. Ce sont trois factures de vente émises ce mois-ci : Boulangerie Rivoire, Client C et Client B." },
    { re: /explique|écran/i, r: "Cet écran vous montre l'essentiel : ce que j'ai déjà préparé, ce qu'il reste à faire, et un seul bouton pour avancer. Tout ce que je fais est expliqué et daté dans l'historique." },
    { re: /fait|historique/i, r: "J'ai lu 40 documents (38 classés, 2 à vérifier), proposé 38 liens avec la banque. La TVA d'octobre attend 3 pièces à vérifier. Tout est dans l'historique, et vous pouvez l'exporter.", lien: ['Voir l\'historique', 'E09.html'] },
    { re: /problème/i, r: "Un souci ? Dites-moi ce qui ne va pas en une phrase, je transmets avec une capture de l'écran.", lien: ['Signaler un problème', 'N01.html'] }
  ];
  var FALLBACK = "Dans cette démonstration, je ne réponds qu'à quelques questions préenregistrées. Essayez l'une de celles ci-dessous.";

  function filChat() { var f = $$('.chat-fil').filter(function (e) { return e.offsetParent !== null; })[0]; return f || $('.chat-fil'); }
  function icone(id) { return '<svg class="ico" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function bas(fil) { fil.scrollTop = fil.scrollHeight; var d = $('.disc-fil'); if (d) d.scrollTop = d.scrollHeight; }
  function messageIA(html, carte, lien) {
    var past = $('.pastille-ia');
    var c = '';
    if (carte) {
      c = '<section class="G-carte-heros demo-carte" data-composant="CarteAction" aria-label="Action à valider">' +
        '<div class="G-carte-tete"><span class="rv-tuile rv-tuile--ambre" aria-hidden="true">' + icone('lu-clock') + '</span><div><p class="rv-surtitre">' + carte.surtitre + '</p><p class="G-carte-titre">' + carte.titre + '</p></div></div>' +
        (carte.note ? '<p class="rv-note">' + carte.note + '</p>' : '') +
        '<button class="btn-plein rv-btn" type="button" data-carte="' + (carte.vers ? 'vers:' + carte.vers : 'ok') + '">' + carte.bouton + '</button> ' +
        '<span class="r3-mention" data-composant="Statut">' + icone('lu-sparkles') + 'Préparé par IA, à valider</span></section>';
    }
    var l = lien ? '<p><a class="btn-texte rv-btn-texte" href="' + lien[1] + '">' + lien[0] + '</a></p>' : '';
    var div = document.createElement('div');
    div.className = 'msg-ia';
    div.innerHTML = '<span class="pastille-ia" aria-hidden="true">' + (past ? past.innerHTML : icone('lu-sparkles')) + '</span><div class="msg-ia-corps"><p>' + html + '</p>' + c + l + '</div>';
    if (carte) div._carte = carte;
    return div;
  }
  function poser(texte, instant) {
    var fil = filChat();
    if (!fil) return;
    var cle = null, rep = null;
    for (var i = 0; i < Q.length; i++) if (Q[i].q === texte) rep = Q[i];
    if (!rep) { for (i = 0; i < Q.length; i++) if (Q[i].re.test(texte) && !/pourquoi.*ventes/i.test(texte)) { rep = Q[i]; break; } }
    var autre = null;
    if (!rep) for (i = 0; i < AUTRES.length; i++) if (AUTRES[i].re.test(texte)) { autre = AUTRES[i]; break; }
    var moi = document.createElement('div');
    moi.className = 'msg-moi';
    moi.innerHTML = '<p></p>'; moi.firstChild.textContent = texte;
    var anchor = $('.suggestions-chat', fil);
    fil.insertBefore(moi, anchor);
    function repondre() {
      var m;
      if (rep) m = messageIA(rep.r, rep.carte, rep.lien);
      else if (autre) m = messageIA(autre.r, null, autre.lien);
      else m = messageIA(FALLBACK, null, null);
      if (att.parentNode) att.parentNode.removeChild(att);
      fil.insertBefore(m, anchor);
      bas(fil); moi.scrollIntoView({ block: 'start' });
    }
    var att = document.createElement('p');
    att.className = 'msg-attente'; att.textContent = "L'assistant prépare la réponse…";
    fil.insertBefore(att, anchor);
    bas(fil);
    if (instant || reduit) { repondre(); } else setTimeout(repondre, 900);
  }
  function suggestionsPretes() {
    $$('.suggestions-chat').forEach(function (ul) {
      var ICO = { tva: 'lu-landmark', impayes: 'lu-users', manque: 'lu-circle-alert', janvier: 'lu-trending-up' };
      ul.innerHTML = Q.map(function (x) { var id = ICO[x.cle]; var ico = (id && document.getElementById(id)) ? icone(id) : ''; return '<li><button class="sugg" type="button" data-q="' + x.cle + '">' + ico + x.q + '</button></li>'; }).join('');
    });
  }
  function validerCarte(btn) {
    var cible = btn.getAttribute('data-carte');
    var sec = btn.closest('section');
    if (cible.indexOf('vers:') === 0) { location.href = cible.slice(5); return; }
    var msg = btn.closest('.msg-ia');
    var rep = null;
    var titre = $('.G-carte-titre', sec); titre = titre ? titre.textContent : '';
    Q.forEach(function (x) { if (x.carte && titre === x.carte.titre) rep = x; });
    var c = rep ? rep.carte : { ok: 'Fait.', lien: null };
    sec.innerHTML = '<div class="demo-carte-ok"><span class="demo-ok">' + icone('lu-circle-check') + 'Validé par vous</span><p>' + c.ok + '</p>' +
      '<span class="r3-mention" data-composant="Statut">' + icone('lu-sparkles') + 'Préparé par IA, validé par vous · tracé dans l\'historique</span>' +
      (c.lien ? '<a class="btn-texte rv-btn-texte" href="' + c.lien[1] + '">' + c.lien[0] + '</a>' : '') + '</div>';
  }

  /* ------------------------------------------------------------ menu « Plus » de la barre mobile */
  function fermerPlus() {
    var p = $('.demo-plus'); if (!p || p.hidden) return;
    p.hidden = true; var b = $('[data-plus]'); if (b) b.setAttribute('aria-expanded', 'false');
  }
  function menuPlus(btn) {
    var p = $('.demo-plus');
    if (p && !p.hidden) { fermerPlus(); return; }
    if (!p) {
      var lien = function (a) { return '<li><a href="' + a.getAttribute('href') + '"' + (a.getAttribute('aria-current') ? ' aria-current="page"' : '') + '>' + ($('.nav-libelle', a) || a).textContent.trim() + '</a></li>'; };
      var dans = $$('.nav-entrees .nav-entree').filter(function (a) { return !document.querySelector('.barre-mobile a.bm-item[href="' + a.getAttribute('href') + '"]'); });
      var sous = $$('.nav-sous-lien'), ouvert = $('.nav-entrees .nav-entree[aria-current="page"] .nav-libelle');
      var pied = $$('.nav-pied .nav-entree').filter(function (a) { return /\.html/.test(a.getAttribute('href') || ''); });
      p = document.createElement('div');
      p.className = 'demo-plus'; p.id = 'demo-plus'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Plus de rubriques');
      p.innerHTML = (sous.length ? '<p>Dans ' + (ouvert ? ouvert.textContent.trim() : 'cette rubrique') + '</p><ul>' + sous.map(lien).join('') + '</ul>' : '') +
        '<p>Rubriques</p><ul>' + dans.map(lien).join('') + '</ul><p>Compte</p><ul>' + pied.map(lien).join('') + '</ul>';
      document.body.appendChild(p);
      btn.setAttribute('aria-controls', 'demo-plus');
    }
    p.hidden = false; btn.setAttribute('aria-expanded', 'true');
    var premier = $('a', p); if (premier) premier.focus();
  }
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') fermerPlus(); });

  /* ------------------------------------------------------------ clics (délégation) */
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t.closest) return;
    var el;
    if ((el = t.closest('[data-vers]'))) { ev.preventDefault(); location.href = el.getAttribute('data-vers'); return; }
    if ((el = t.closest('[data-etat]'))) { ev.preventDefault(); etat(el.getAttribute('data-etat')); return; }
    if ((el = t.closest('[data-telecharger]'))) { ev.preventDefault(); telecharge(el.getAttribute('data-telecharger')); return; }
    if ((el = t.closest('[data-code]'))) { ev.preventDefault(); montrerCode(); return; }
    if ((el = t.closest('[data-annuler38]'))) { ev.preventDefault(); annuler38(); return; }
    if ((el = t.closest('[data-confirmer]'))) { ev.preventDefault(); confirmer38(); return; }
    if ((el = t.closest('[data-valider]'))) { ev.preventDefault(); valider(el, el.getAttribute('data-valider')); return; }
    if ((el = t.closest('[data-depot]'))) { ev.preventDefault(); lancerDepot(); return; }
    if ((el = t.closest('[data-carte]'))) { ev.preventDefault(); validerCarte(el); return; }
    if ((el = t.closest('[data-toast]'))) { ev.preventDefault(); toast(el.getAttribute('data-toast')); return; }
    if ((el = t.closest('button.sugg'))) {
      ev.preventDefault();
      var cle = el.getAttribute('data-q'); var q = null;
      Q.forEach(function (x) { if (x.cle === cle) q = x; });
      poser(q ? q.q : el.textContent.trim());
      return;
    }
    if ((el = t.closest('.composeur button.envoyer'))) {
      ev.preventDefault();
      var ta = $('textarea', el.closest('.composeur'));
      if (ta && ta.value.trim()) { var v = ta.value.trim(); ta.value = ''; el.disabled = true; poser(v); }
      return;
    }
    if ((el = t.closest('.composeur .outil'))) { ev.preventDefault(); toast("Dans la démonstration, on ne dépose pas de fichier ici : utilisez « Ajouter »."); return; }
    if ((el = t.closest('.rv-aide, .ent-aide, [role="img"][title="?"]'))) { ev.preventDefault(); var a = el.getAttribute('aria-label') || el.getAttribute('title'); if (a) toast(a); return; }
    if ((el = t.closest('.nav-reduire'))) { ev.preventDefault(); var c = el.closest('.cadre'); if (c) c.classList.toggle('cadre--menu-reduit'); return; }
    if ((el = t.closest('.chat-reduire'))) { ev.preventDefault(); basculeChat(el, 'cadre--chat-reduit'); return; }
    if ((el = t.closest('.chat-agrandir'))) { ev.preventDefault(); basculeChat(el, 'cadre--chat-moitie'); return; }
    if ((el = t.closest('.chat-plein-ecran'))) { ev.preventDefault(); basculeChat(el, 'cadre--chat-plein'); return; }
    if ((el = t.closest('.chat-revenir'))) { ev.preventDefault(); var c2 = el.closest('.cadre'); if (c2) { c2.classList.remove('cadre--chat-plein', 'cadre--chat-moitie', 'cadre--chat-reduit'); } return; }
    if ((el = t.closest('[data-plus]'))) { ev.preventDefault(); menuPlus(el); return; }
    if (!t.closest('.demo-plus')) fermerPlus();
    if ((el = t.closest('a[data-simule]'))) { ev.preventDefault(); toast("Cette partie n'est pas détaillée dans la démonstration."); return; }
    if ((el = t.closest('button'))) {
      if (el.closest('.demo-pres, .demo-fin, summary, .composeur, form[aria-label*="Code"]') || el.type === 'submit') return;
      if (el.classList.contains('outil')) { ev.preventDefault(); toast('Action simulée : ' + (el.getAttribute('aria-label') || 'bouton') + '. Rien n\'est enregistré.'); return; }
      ev.preventDefault();
      var lib = (el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      toast('Action simulée' + (lib ? ' : « ' + lib + ' »' : '') + '. Rien n\'est enregistré, tout est fictif.');
    }
  });
  function basculeChat(el, cls) {
    var c = el.closest('.cadre'); if (!c) return;
    var etait = c.classList.contains(cls);
    c.classList.remove('cadre--chat-plein', 'cadre--chat-moitie', 'cadre--chat-reduit');
    if (!etait) c.classList.add(cls);
  }
  document.addEventListener('input', function (ev) {
    var ta = ev.target;
    if (ta && ta.tagName === 'TEXTAREA' && ta.closest('.composeur')) { var b = $('button.envoyer', ta.closest('.composeur')); if (b) b.disabled = !ta.value.trim(); }
  });
  document.addEventListener('keydown', function (ev) {
    var ta = ev.target;
    if (ta && ta.tagName === 'TEXTAREA' && ta.closest('.composeur') && ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault(); var b = $('button.envoyer', ta.closest('.composeur')); if (b && !b.disabled) b.click();
    }
  });

  /* ------------------------------------------------------------ mode Présentation */
  var G = ['Mon activité', 'Mon mois', 'Dépôt d\'un dossier de factures', 'Un document : pourquoi, qui, quand', 'Ma banque', 'La discussion', 'Mes documents'];
  var STEPS = [
    { g: 0, page: 'E56', texte: "Mon activité : les ventes, l'argent en banque, les clients qui n'ont pas payé et la TVA, d'un seul coup d'œil. Chaque chiffre ouvre sa liste.", act: function () { location.hash = '#liste-retard'; var n = $('.nav'); if (n) n.scrollTop = 0; window.scrollTo(0, 0); } },
    { g: 0, page: 'E56', texte: "Un clic sur « Clients impayés » ouvre la liste : Boulangerie Rivoire, 1 200 €, 23 jours de retard. La relance est déjà prête.", act: function () { } },
    { g: 1, page: 'E01', texte: "Mon mois : l'assistant dit ce qui est fait et ce qui manque avant de valider octobre. La première chose : le relevé de banque.", act: function (i) { listeFinDeMois(i); } },
    { g: 1, page: 'E01', texte: "Six lignes, un état écrit et un bouton par ligne. Rien de technique : l'assistant prépare, Claire valide.", act: function () { } },
    { g: 2, page: 'E03', texte: "Ajouter : un seul geste. On dépose un dossier, un ZIP (jusqu'à 500 fichiers) ou des photos. L'assistant s'occupe du reste.", act: function (i) { lancerDepot(i); } },
    { g: 2, page: 'E03', texte: "Le dossier est lu et trié : « 38 rangées, 2 à vérifier ». L'assistant propose, Claire valide : elle n'a que les 2 doutes à regarder.", act: function () { finirDepot(); } },
    { g: 3, page: 'E08', texte: "Un document : la facture lue par l'assistant, ce qu'il a compris, et les 2 points qu'il n'est pas sûr de comprendre.", act: function (i) { var s = pourquoi(); if (s && !i) { s.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'start' }); s.classList.add('demo-pas'); } } },
    { g: 3, page: 'E08', texte: "« Pourquoi ? » : chaque écriture porte sa raison en une phrase, sa pièce d'origine, qui l'a faite (l'IA), quand, et son niveau de confiance.", act: function (i) { if (!i) telecharge('historique'); } },
    { g: 3, page: 'E08', texte: "« Exporter l'historique » : un fichier lisible, remis au comptable sans accès au logiciel. C'est notre argument : la transparence.", act: function () { } },
    { g: 4, page: 'E12', texte: "Ma banque : 38 liens proposés, un clic pour confirmer. L'assistant a préparé les liens entre opérations et factures ; rien n'est définitif avant votre clic.", act: function () { confirmer38(); } },
    { g: 4, page: 'E12', texte: "Un clic : les 38 liens sont confirmés (annulable 10 secondes). Il reste un écart de 200 € et 3 opérations sans facture à regarder.", act: function () { } },
    { g: 5, page: 'E25', texte: "La discussion : on parle comme à un collègue. Claire demande : « Combien je dois de TVA ce mois-ci ? »", act: function (i) { demanderTVA(i); } },
    { g: 5, page: 'E25', texte: "L'assistant répond en une phrase et prépare une carte d'action. Il propose, Claire valide d'un clic.", act: function (i) { var b = $('[data-carte="ok"]'); if (b) validerCarte(b); } },
    { g: 5, page: 'E25', texte: "Validé : la déclaration est préparée en brouillon ; vous la déposez vous-même sur impots.gouv, je vous guide pas à pas, et tout est tracé dans l'historique.", act: function () { } },
    { g: 6, page: 'E07', texte: "Mes documents : tout est rangé par année comptable. Le fichier des écritures (FEC) pour le comptable se télécharge en un clic.", act: function (i) { if (!i) telecharge('fec'); } },
    { g: 6, page: 'E07', texte: "Voilà : l'assistant prépare, vous validez. Chaque ligne est expliquée, tracée, et l'historique s'exporte.", act: function () { finPres(); }, dernier: true }
  ];
  function listeFinDeMois(instant) {
    var h = $$('main h2').filter(function (e) { return /Liste de fin de mois/i.test(e.textContent); })[0];
    if (!h) return;
    var sec = h.closest('section') || h;
    $$('details', sec).slice(0, 2).forEach(function (d) { d.open = true; });
    sec.classList.add('demo-pas');
    sec.scrollIntoView({ behavior: (instant || reduit) ? 'auto' : 'smooth', block: 'start' });
  }
  var avant38 = null;
  function confirmer38() {
    var b = $('main [data-confirmer]');
    if (!b) return;
    var sec = b.closest('section') || b.parentNode;
    if (sec.querySelector('.demo-ok-bloc')) return;
    avant38 = sec.innerHTML;
    sec.innerHTML = '<div class="demo-depot demo-ok-bloc" aria-live="polite"><p class="demo-ok">' + icone('lu-circle-check') + "C'est fait : 38 liens confirmés par vous</p>" +
      '<h2 class="demo-depot-titre">Il reste 1 écart à regarder</h2>' +
      '<p class="rv-note">3 opérations n\'ont pas de facture. Vous pouvez annuler pendant 10 secondes ; c\'est écrit dans l\'historique.</p>' +
      '<div class="demo-depot-actions"><a class="btn-plein rv-btn" href="E08.html">Voir l\'écart de 200 €</a><button type="button" class="btn-texte rv-btn-texte" data-annuler38="1">Annuler</button></div>' +
      '<span class="r3-mention" data-composant="Statut">' + icone('lu-sparkles') + 'Préparé par IA, à valider</span></div>';
    toast('38 liens confirmés. Annulable pendant 10 secondes.');
  }
  function annuler38() {
    var b = $('main .demo-ok-bloc');
    if (!b || avant38 === null) return;
    var sec = b.closest('section') || b.parentNode;
    sec.innerHTML = avant38; avant38 = null;
    toast('Annulé : les 38 liens sont de nouveau à confirmer.');
  }
  function valider(btn, msg) {
    btn.textContent = '✓ Confirmé';
    btn.classList.add('demo-confirme');
    toast(msg);
  }
  function pourquoi() {
    var t = $$('h2').filter(function (h) { return /pourquoi/i.test(h.textContent); })[0];
    return t ? (t.closest('section') || t) : null;
  }
  function demanderTVA(instant) {
    var ta = $('.composeur textarea');
    var q = Q[0].q;
    if (instant || reduit || !ta) { poser(q, instant); return; }
    var k = 0;
    ta.focus();
    var tm = setInterval(function () {
      k += 2; ta.value = q.slice(0, k);
      var b = $('.composeur button.envoyer'); if (b) b.disabled = false;
      if (k >= q.length) { clearInterval(tm); setTimeout(function () { ta.value = ''; var b2 = $('.composeur button.envoyer'); if (b2) b2.disabled = true; poser(q); }, 350); }
    }, 35);
  }
  var idx = -1, pres = null;
  function url(i) { return STEPS[i].page + '.html'; }
  function allerA(i) {
    stock('demo-pres', String(i));
    location.href = url(i) + (i > 0 ? '?pres=' + i : '?pres=0');
  }
  function rejouer(i) {
    /* retrouve l'état d'une page rechargée : rejoue en accéléré les actions précédentes de la même page */
    var j = i; while (j > 0 && STEPS[j - 1].page === STEPS[i].page) j--;
    for (var k = j; k < i; k++) { try { STEPS[k].act(true); } catch (e) {} }
  }
  function panneau() {
    if (!pres) {
      pres = document.createElement('aside');
      pres.className = 'demo-pres';
      pres.setAttribute('role', 'region');
      pres.setAttribute('aria-label', 'Présentation guidée');
      document.body.insertBefore(pres, bandeau.nextSibling);
      document.body.setAttribute('data-demo-pres', '1');
    }
    var s = STEPS[idx];
    var segs = G.map(function (_, k) { return '<span class="' + (k < s.g ? 'fait' : k === s.g ? 'en-cours' : '') + '"></span>'; }).join('');
    var surPage = s.page === PAGE;
    pres.innerHTML =
      '<div class="demo-pres-tete"><span class="demo-pres-etape">Étape ' + (s.g + 1) + ' sur ' + G.length + '</span><h2 class="demo-pres-titre">' + G[s.g] + '</h2>' +
      '<button type="button" class="demo-quitter" data-pres="quitter" aria-label="Quitter la présentation">Quitter</button></div>' +
      '<p class="demo-pres-texte">' + s.texte + '</p>' +
      '<div class="demo-pres-barre" role="progressbar" aria-valuemin="1" aria-valuemax="' + G.length + '" aria-valuenow="' + (s.g + 1) + '" aria-label="Avancement de la présentation : étape ' + (s.g + 1) + ' sur ' + G.length + '">' + segs + '</div>' +
      '<div class="demo-pres-actions"><button type="button" data-pres="prec"' + (idx === 0 ? ' disabled' : '') + '>Précédent</button><span class="demo-sp"></span>' +
      (surPage ? '' : '<button type="button" data-pres="reprendre">Reprendre le parcours</button>') +
      '<button type="button" class="demo-suivant" data-pres="suiv">' + (s.dernier ? 'Terminer' : 'Suivant') + '</button></div>';
  }
  function suivant() {
    var s = STEPS[idx];
    if (s.page !== PAGE) { allerA(idx); return; }
    try { s.act(false); } catch (e) {}
    if (s.dernier) return;
    var n = STEPS[idx + 1];
    if (n.page !== PAGE) { allerA(idx + 1); return; }
    idx += 1; stock('demo-pres', String(idx)); panneau();
    var f = $('[data-pres="suiv"]'); if (f) f.focus({ preventScroll: true });
  }
  function precedent() { if (idx > 0) allerA(idx - 1); }
  function quitter() { stock('demo-pres', null); if (pres) pres.parentNode.removeChild(pres); pres = null; document.body.removeAttribute('data-demo-pres'); try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {} }
  function finPres() {
    var f = document.createElement('div');
    f.className = 'demo-fin'; f.setAttribute('role', 'dialog'); f.setAttribute('aria-modal', 'true'); f.setAttribute('aria-labelledby', 'demo-fin-t');
    f.innerHTML = '<div><h2 id="demo-fin-t">L\'IA prépare, vous validez.</h2><p>Chaque écriture est expliquée, tracée, et l\'historique s\'exporte pour votre comptable.</p><p class="demo-note" style="font-size:14px">Démonstration : données fictives. Préparé par IA, à valider.</p>' +
      '<button type="button" class="demo-suivant" data-fin="recommencer">Recommencer la présentation</button><button type="button" class="demo-lien" data-fin="explorer">Explorer librement</button><a class="demo-lien" href="../index.html">Retour à l\'accueil</a></div>';
    document.body.appendChild(f);
    var b = $('[data-fin="recommencer"]', f); if (b) b.focus();
  }
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest && ev.target.closest('[data-pres],[data-fin]');
    if (!el) return;
    ev.preventDefault(); ev.stopPropagation();
    var p = el.getAttribute('data-pres'), f = el.getAttribute('data-fin');
    if (p === 'suiv') suivant(); else if (p === 'prec') precedent(); else if (p === 'quitter') quitter(); else if (p === 'reprendre') allerA(idx);
    if (f === 'recommencer') { stock('demo-pres', '0'); location.href = 'E56.html?pres=0'; }
    if (f === 'explorer') { var d = $('.demo-fin'); if (d) d.parentNode.removeChild(d); quitter(); }
  }, true);
  document.addEventListener('keydown', function (ev) {
    if (idx < 0 || !pres) return;
    var cible = ev.target;
    if (cible && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)) return;
    if (ev.key === 'ArrowRight') { ev.preventDefault(); suivant(); }
    else if (ev.key === 'ArrowLeft') { ev.preventDefault(); precedent(); }
    else if (ev.key === 'Escape' && !$('.demo-fin')) { quitter(); }
  });

  /* ------------------------------------------------------------ démarrage */
  function init() {
    var p = new URLSearchParams(location.search);
    suggestionsPretes();
    if (p.get('e') && document.getElementById('etat-' + p.get('e'))) etat(p.get('e'));
    var demande = p.get('pres');
    var courant = demande !== null ? parseInt(demande, 10) : (stock('demo-pres') !== null ? parseInt(stock('demo-pres'), 10) : NaN);
    if (!isNaN(courant) && courant >= 0 && courant < STEPS.length) {
      idx = courant; stock('demo-pres', String(idx));
      if (STEPS[idx].page === PAGE) rejouer(idx);
      panneau();
      if (demande !== null) { var f = $('[data-pres="suiv"]'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} } }
    }
  }
  window.__demo = { poser: poser, etat: etat, toast: toast, telecharge: telecharge, STEPS: STEPS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
