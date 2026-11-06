/* Lot 09 : squelettes, filtres de E24, visionneuse de E08, export de liste, aperçu avant impression.
   Tout est simulé : rien n'est envoyé ni enregistré. Données fictives. */
(function () {
  'use strict';
  var PAGE = document.body.getAttribute('data-ecran') || '';
  var MAIN = document.querySelector('main#contenu') || document.querySelector('main');
  var ACTIONS = {};
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  var tt;
  function toast(msg) {
    var t = $('.demo-toast');
    if (!t) { t = el('div', 'demo-toast'); t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; clearTimeout(tt);
    tt = setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4500);
  }
  /* Nos boutons passent avant la délégation générale de demo.js (qui afficherait « Action simulée »). */
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-l9]');
    if (!b) return;
    ev.preventDefault(); ev.stopPropagation();
    var h = ACTIONS[b.getAttribute('data-l9')];
    if (h) h(b);
  }, true);

  /* ---------- 3. Squelettes de chargement (600 ms) ---------- */
  if (MAIN && /^(E01|E07|E12|E24|E56)$/.test(PAGE)) {
    MAIN.classList.add('l9-charge');
    var sq = el('div', 'l9-sq', '<div class="l9-sq-barre l9-sq-barre--titre"></div><div class="l9-sq-barre" style="width:70%"></div><div class="l9-sq-carte"></div><div class="l9-sq-barre" style="width:55%"></div><div class="l9-sq-carte"></div><div class="l9-sq-carte"></div>');
    sq.setAttribute('role', 'status'); sq.setAttribute('aria-label', 'Chargement en cours');
    MAIN.insertBefore(sq, MAIN.firstChild);
    setTimeout(function () { MAIN.classList.remove('l9-charge'); if (sq.parentNode) sq.parentNode.removeChild(sq); }, 600);
  }

  /* ---------- 2. Filtres de E24 ---------- */
  function filtresE24() {
    var liste = $('ul.rv-liste[aria-label="Factures d\'achat de l\'année"]');
    if (!liste) return;
    var lignes = $$(':scope > li.rv-ligne', liste);
    var lib = { '': 'Toutes', confirmer: 'À confirmer', verifier: 'À vérifier', sans: 'Sans paiement', liee: 'Déjà liée à la banque' };
    function etatDe(li) {
      var p = $('.rv-pastille', li); var t = p ? p.textContent.trim() : '';
      if (/vérifier|relire/i.test(t)) return 'verifier';
      if (/Proposé/i.test(t)) return 'confirmer';
      if (/Sans paiement/i.test(t)) return 'sans';
      return 'liee';
    }
    function moisDe(li) {
      var s = $('.rv-ligne-sous', li); var t = s ? s.textContent : '';
      var m = t.match(/(\d{2})\/(\d{2})\/(\d{4})/); if (m) return m[3] + '-' + m[2];
      m = t.match(/(\d{2})\/(\d{2})/); return m ? '2026-' + m[2] : '';
    }
    function tiersDe(li) { var o = $('[data-fictif]', li); return o ? o.textContent.trim() : ''; }
    var tiers = [];
    lignes.forEach(function (li) { var t = tiersDe(li); if (t && tiers.indexOf(t) < 0) tiers.push(t); });
    tiers.sort(function (a, b) { return a.localeCompare(b, 'fr'); });
    var corps = $('details.rv-repli .rv-repli-corps', liste.parentNode);
    if (!corps) return;
    var det = corps.parentNode;
    var zone = el('div', 'l9-filtres');
    zone.innerHTML =
      '<label>Période<select data-l9-f="mois"><option value="">Toute l\'année</option><option value="2026-10">Octobre 2026</option><option value="2026-11">Novembre 2026</option></select></label>' +
      '<label>État<select data-l9-f="etat">' + Object.keys(lib).map(function (k) { return '<option value="' + k + '">' + lib[k] + '</option>'; }).join('') + '</select></label>' +
      '<label>Fournisseur ou client<select data-l9-f="tiers"><option value="">Tous</option>' + tiers.map(function (t) { return '<option>' + t.replace(/&/g, '&amp;') + '</option>'; }).join('') + '</select></label>' +
      '<button class="l9-btn" type="button" data-l9="e24-effacer">Effacer les filtres</button>';
    corps.insertBefore(zone, corps.firstChild);
    var msg = el('p', 'l9-filtres-etat'); msg.setAttribute('aria-live', 'polite');
    var vide = el('p', 'l9-vide', 'Aucune facture ne correspond à ces filtres. <button class="l9-btn" type="button" data-l9="e24-effacer">Effacer les filtres</button>');
    vide.hidden = true;
    liste.parentNode.insertBefore(vide, liste); liste.parentNode.insertBefore(msg, vide);
    det.open = true;
    var sel = {}; $$('select[data-l9-f]', zone).forEach(function (s) { sel[s.getAttribute('data-l9-f')] = s; });
    var onglets = $$('[aria-label="Filtrer les achats"] .rv-onglet');
    var codeOnglet = { 'Toutes': '', 'À confirmer': 'confirmer', 'À vérifier': 'verifier', 'Sans paiement': 'sans' };
    function nomOnglet(o) { return o.firstChild.textContent.trim(); }
    function appliquer() {
      var f = { mois: sel.mois.value, etat: sel.etat.value, tiers: sel.tiers.value };
      var n = 0;
      lignes.forEach(function (li) {
        var ok = (!f.mois || moisDe(li) === f.mois) && (!f.etat || etatDe(li) === f.etat) && (!f.tiers || tiersDe(li) === f.tiers);
        li.hidden = !ok; if (ok) n++;
      });
      onglets.forEach(function (o) {
        var c = codeOnglet[nomOnglet(o)];
        o.setAttribute('aria-selected', c !== undefined && c === f.etat ? 'true' : 'false');
      });
      vide.hidden = n > 0;
      msg.textContent = n + ' facture' + (n > 1 ? 's' : '') + ' affichée' + (n > 1 ? 's' : '') + ' sur ' + lignes.length + ' montrées dans la démonstration (48 en tout dans l\'année).';
    }
    ACTIONS['e24-effacer'] = function () { sel.mois.value = ''; sel.etat.value = ''; sel.tiers.value = ''; appliquer(); };
    zone.addEventListener('change', appliquer);
    onglets.forEach(function (o) {
      o.addEventListener('click', function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        sel.etat.value = codeOnglet[nomOnglet(o)] || ''; appliquer();
      }, true);
    });
    appliquer();
  }
  if (PAGE === 'E24') filtresE24();

  /* ---------- 4. Visionneuse de E08 : zoom, surlignage, masquage ---------- */
  function visionneuseE08() {
    var ap = $('.r4-apercu'); if (!ap) return;
    var papier = $('.papier', ap); if (!papier) return;
    var vue = el('div', 'l9-vue'); ap.insertBefore(vue, papier); vue.appendChild(papier);
    var niveaux = [0.75, 1, 1.25, 1.5, 2], i = 1;
    var barre = el('div', 'l9-outils');
    barre.setAttribute('role', 'toolbar'); barre.setAttribute('aria-label', 'Outils de la visionneuse');
    barre.innerHTML =
      '<button class="l9-btn" type="button" data-l9="zoom-moins" aria-label="Réduire le zoom">Zoom −</button>' +
      '<span class="l9-zoom-val" aria-live="polite">100 %</span>' +
      '<button class="l9-btn" type="button" data-l9="zoom-plus" aria-label="Agrandir le zoom">Zoom +</button>' +
      '<button class="l9-btn" type="button" data-l9="surligner" aria-pressed="false">Montrer ce que j\'ai lu</button>' +
      '<button class="l9-btn" type="button" data-l9="masquer" aria-pressed="false">Masquer les données sensibles</button>';
    ap.insertBefore(barre, vue);
    ap.appendChild(el('p', 'l9-note', 'Zoom, surlignage et masquage sont simulés : le document déposé n\'est jamais modifié.'));
    var val = $('.l9-zoom-val', barre);
    function zoom() { vue.style.setProperty('--l9-zoom', niveaux[i]); val.textContent = Math.round(niveaux[i] * 100) + ' %'; }
    ACTIONS['zoom-moins'] = function () { if (i > 0) { i--; zoom(); } };
    ACTIONS['zoom-plus'] = function () { if (i < niveaux.length - 1) { i++; zoom(); } };
    function bascule(b, cls, texteOn, texteOff) {
      var on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.textContent = on ? texteOn : texteOff; vue.classList.toggle(cls, on);
    }
    ACTIONS['surligner'] = function (b) { bascule(b, 'l9-surligne', 'Cacher les zones lues', 'Montrer ce que j\'ai lu'); };
    ACTIONS['masquer'] = function (b) { bascule(b, 'l9-masque', 'Montrer les données sensibles', 'Masquer les données sensibles'); };
    var d = ap.closest('details'); if (d) d.open = true;
  }
  if (PAGE === 'E08') visionneuseE08();

  /* ---------- 5. Export de n'importe quelle liste (simulé) ---------- */
  function proteger(c) {
    c = String(c).replace(/\s+/g, ' ').trim();
    if (/^[=+\-@]/.test(c)) c = "'" + c;
    return c;
  }
  function csvLigne(cells) { return cells.map(function (c) { return '"' + proteger(c).replace(/"/g, '""') + '"'; }).join(';'); }
  function lignesDe(liste) {
    if (liste.tagName === 'TABLE') {
      return $$('tr', liste).filter(function (r) { return !r.hidden; }).map(function (r) { return $$('th,td', r).map(function (c) { return c.textContent; }); });
    }
    return $$(':scope > li', liste).filter(function (li) { return !li.hidden; }).map(function (li) {
      var cells = ['.rv-ligne-titre', '.rv-ligne-sous', '.rv-ligne-montant', '.rv-pastille'].map(function (s) { var n = $(s, li); return n ? n.textContent : ''; });
      if (!cells.join('')) cells = $$(':scope > span, :scope > a', li).map(function (n) { return n.textContent; });
      if (!cells.join('')) cells = [li.textContent];
      return cells;
    });
  }
  function exporter(liste, nom, msg) {
    var rows = lignesDe(liste);
    var texte = [csvLigne(['EXEMPLE · DÉMONSTRATION · DONNÉES FICTIVES']), csvLigne(['Préparé par IA, à valider'])].concat(rows.map(csvLigne)).join('\r\n');
    var blob = new Blob(['﻿' + texte], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'liste-' + nom + '-EXEMPLE.csv'; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 1000);
    msg.textContent = 'Export simulé : un fichier d\'exemple de ' + rows.length + ' ligne' + (rows.length > 1 ? 's' : '') + ' a été préparé sur votre appareil, rien n\'est envoyé. Les cellules sont protégées contre les formules.';
  }
  function exportsListes() {
    if (!MAIN) return;
    var n = 0;
    $$('ul.rv-liste, table', MAIN).forEach(function (l) {
      if (l.closest('.rv-ligne-detail, .tv, .l9-vue, [role="alertdialog"], template, aside, .chat')) return;
      var nb = l.tagName === 'TABLE' ? $$('tr', l).length : $$(':scope > li', l).length;
      if (nb < 3) return;
      n++;
      var bloc = l.closest('section'); var h = bloc && $('h2', bloc);
      var nom = (h ? h.textContent : 'liste').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'liste';
      var zone = el('div', 'l9-export');
      var b = el('button', 'l9-btn', 'Exporter cette liste'); b.type = 'button'; b.setAttribute('data-l9', 'export-' + n);
      var m = el('p', 'l9-export-msg', 'Fichier d\'exemple (CSV). Les cellules sont protégées contre les formules.'); m.setAttribute('aria-live', 'polite');
      zone.appendChild(b); zone.appendChild(m);
      l.parentNode.insertBefore(zone, l);
      ACTIONS['export-' + n] = function () { exporter(l, nom, m); };
    });
  }
  exportsListes();

  /* ---------- 6. Aperçu avant impression (E20, E35, E36) ---------- */
  function apercuImpression() {
    var tete = $('.rv-entete', MAIN); if (!tete) return;
    var act = $('.rv-entete-actions', tete);
    if (!act) { act = el('div', 'rv-entete-actions'); tete.appendChild(act); }
    var b = el('button', 'btn-contour rv-btn', 'Aperçu avant impression'); b.type = 'button'; b.setAttribute('data-l9', 'apercu');
    act.appendChild(b);
    var ov = null, opener = null;
    function fermer() { if (!ov || ov.hidden) return; ov.hidden = true; document.body.classList.remove('l9-impression'); if (opener) opener.focus(); }
    ACTIONS['apercu'] = function (btn) {
      opener = btn;
      if (!ov) {
        ov = el('div', 'l9-apercu'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Aperçu avant impression');
        ov.innerHTML = '<div class="l9-apercu-barre"><strong>Aperçu avant impression</strong><button class="l9-btn" type="button" data-l9="imprimer">Imprimer (simulé)</button><button class="l9-btn" type="button" data-l9="fermer-apercu">Fermer l\'aperçu</button></div><div class="l9-apercu-zone"></div>';
        document.body.appendChild(ov);
        ACTIONS['fermer-apercu'] = fermer;
        ACTIONS['imprimer'] = function () { toast('Impression simulée : la feuille sort en niveaux de gris, avec la mention EXEMPLE.'); try { window.print(); } catch (e) { } };
        document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') fermer(); });
      }
      var c = MAIN.cloneNode(true);
      $$('.l9-ariane,.l9-export,.l9-sq,button,nav,svg,.rv-aide,.rv-entete-actions,[role="alertdialog"],.tv,template,script,input,select,[hidden]', c).forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
      $$('details', c).forEach(function (d) { d.open = true; });
      $$('[id]', c).forEach(function (n) { n.removeAttribute('id'); });
      var f = el('div', 'l9-feuille');
      f.innerHTML = '<p><strong>Lemoine Rénovation</strong> (société fictive) · Axion Compta · Démonstration</p>';
      var corps = el('div'); corps.innerHTML = c.innerHTML; f.appendChild(corps);
      f.appendChild(el('p', 'l9-feuille-pied', 'Préparé par IA, à valider. Document d\'exemple : données fictives, sans valeur. Lisible en niveaux de gris.'));
      var zone = $('.l9-apercu-zone', ov); zone.innerHTML = ''; zone.appendChild(f);
      ov.hidden = false; document.body.classList.add('l9-impression');
      var fb = $('[data-l9="fermer-apercu"]', ov); if (fb) fb.focus();
    };
  }
  if (MAIN && /^(E20|E35|E36)$/.test(PAGE)) apercuImpression();
})();
