/* Lot 07 : "Tout marquer comme lu" (T08), état simulé. Rien n'est enregistré. */
(function () {
  var b = document.querySelector('[data-l7-tout]');
  if (!b) return;
  b.addEventListener('click', function (ev) {
    ev.preventDefault(); ev.stopPropagation();
    var items = document.querySelectorAll('[data-l7-notif]');
    for (var i = 0; i < items.length; i++) {
      items[i].setAttribute('data-lu', '1');
      var e = items[i].querySelector('[data-l7-etat]');
      if (e) e.innerHTML = '<svg class="ico ico--petite" aria-hidden="true"><use href="#lu-check"/></svg>Lu';
    }
    var c = document.querySelector('[data-l7-compte]');
    if (c) c.textContent = 'Tout est lu';
    b.disabled = true; b.textContent = 'Tout est lu';
  }, true);
})();
