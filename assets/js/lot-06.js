/* Lot 06 : comportements simulés des confirmations fortes (aucun fichier existant modifié). */
(function () {
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('[data-fermer]');
    if (!t) return;
    ev.preventDefault();
    var d = t.closest('details');
    if (d) { d.open = false; var s = d.querySelector('summary'); if (s) s.focus(); }
  });
  document.addEventListener('input', function (ev) {
    var i = ev.target;
    if (!i.matches || !i.matches('input[data-attendu]')) return;
    var corps = i.closest('.l6-confirm-corps');
    var b = corps && corps.querySelector('button[data-confirme]');
    if (b) b.disabled = i.value.trim() !== i.getAttribute('data-attendu');
  });
})();
