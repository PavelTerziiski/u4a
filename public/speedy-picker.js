(function() {
  var PROXY = 'https://www.u4a.bg/api/speedy-offices';

  function init() {
    var checkInterval = setInterval(function() {
      var allInputs = document.querySelectorAll('input[type="radio"]');
      var speedyRadio = null;
      for (var i = 0; i < allInputs.length; i++) {
        var lbl = document.querySelector('label[for="' + allInputs[i].id + '"]');
        if (lbl && lbl.textContent.indexOf('Офис на Speedy') !== -1) {
          speedyRadio = allInputs[i];
          break;
        }
      }
      if (!speedyRadio) return;
      clearInterval(checkInterval);

      document.addEventListener('change', function(e) {
        if (e.target && e.target.type === 'radio') {
          var lbl = document.querySelector('label[for="' + e.target.id + '"]');
          if (lbl && lbl.textContent.indexOf('Офис на Speedy') !== -1) {
            injectPicker();
          } else {
            removePicker();
          }
        }
      });

      if (speedyRadio.checked) injectPicker();
    }, 600);
  }

  function removePicker() {
    var el = document.getElementById('speedy-office-picker');
    if (el) el.remove();
  }

  function injectPicker() {
    if (document.getElementById('speedy-office-picker')) return;
    var allInputs = document.querySelectorAll('input[type="radio"]');
    var insertAfter = null;
    for (var i = 0; i < allInputs.length; i++) {
      var lbl = document.querySelector('label[for="' + allInputs[i].id + '"]');
      if (lbl && lbl.textContent.indexOf('Офис на Speedy') !== -1) {
        insertAfter = allInputs[i].closest('div, li, p') || allInputs[i].parentNode;
        break;
      }
    }
    if (!insertAfter) return;

    var wrapper = document.createElement('div');
    wrapper.id = 'speedy-office-picker';
    wrapper.style.cssText = 'margin:10px 0 16px 0;padding:14px;border:2px solid #e8f0eb;border-radius:10px;background:#f7fbf8;';
    wrapper.innerHTML =
      '<div style="font-size:13px;font-weight:700;margin-bottom:8px;color:#1a5c2a;">Изберете офис на Speedy</div>' +
      '<input id="speedy-search-input" type="text" placeholder="Търси по град или адрес..." autocomplete="off" style="width:100%;padding:9px 11px;border:1px solid #ccc;border-radius:7px;font-size:14px;box-sizing:border-box;outline:none;" />' +
      '<div id="speedy-office-results" style="display:none;max-height:200px;overflow-y:auto;border:1px solid #ddd;border-radius:7px;margin-top:4px;background:#fff;box-shadow:0 3px 10px rgba(0,0,0,0.1);"></div>' +
      '<div id="speedy-office-selected" style="display:none;margin-top:8px;padding:8px 10px;background:#e6f4ea;border-radius:6px;font-size:13px;color:#1a5c2a;font-weight:600;"></div>' +
      '<input type="hidden" id="speedy_office_id" name="speedy_office_id" value="" />' +
      '<input type="hidden" id="speedy_office_name" name="speedy_office_name" value="" />';

    insertAfter.parentNode.insertBefore(wrapper, insertAfter.nextSibling);
    searchOffices('София');

    var timer;
    document.getElementById('speedy-search-input').addEventListener('input', function() {
      clearTimeout(timer);
      var q = this.value.trim();
      if (q.length < 2) { document.getElementById('speedy-office-results').style.display = 'none'; return; }
      timer = setTimeout(function() { searchOffices(q); }, 400);
    });
  }

  function searchOffices(q) {
    var results = document.getElementById('speedy-office-results');
    if (!results) return;
    results.innerHTML = '<div style="padding:10px;color:#888;font-size:13px;">Зарежда...</div>';
    results.style.display = 'block';
    fetch(PROXY + '?q=' + encodeURIComponent(q))
      .then(function(r) { return r.json(); })
      .then(function(offices) {
        if (!offices || !offices.length) {
          results.innerHTML = '<div style="padding:10px;color:#888;font-size:13px;">Няма намерени офиси</div>';
          return;
        }
        results.innerHTML = '';
        offices.forEach(function(office) {
          var item = document.createElement('div');
          item.style.cssText = 'padding:9px 12px;cursor:pointer;border-bottom:1px solid #f2f2f2;font-size:13px;line-height:1.4;';
          item.innerHTML = '<strong>' + (office.name || '') + '</strong><br><span style="color:#666;font-size:12px;">' + (office.address && office.address.fullAddressString || '') + '</span>';
          item.addEventListener('mouseenter', function() { item.style.background = '#f0f7f2'; });
          item.addEventListener('mouseleave', function() { item.style.background = '#fff'; });
          item.addEventListener('click', function() {
            var officeName = (office.name || '') + ' — ' + (office.address && office.address.fullAddressString || '');
            document.getElementById('speedy_office_id').value = office.id;
            document.getElementById('speedy_office_name').value = officeName;
            document.getElementById('speedy-search-input').value = office.name || '';
            document.getElementById('speedy-office-results').style.display = 'none';
            var sel = document.getElementById('speedy-office-selected');
            sel.textContent = 'Избран: ' + officeName;
            sel.style.display = 'block';
          });
          results.appendChild(item);
        });
      })
      .catch(function() {
        results.innerHTML = '<div style="padding:10px;color:#c00;font-size:13px;">Грешка при зареждане</div>';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
