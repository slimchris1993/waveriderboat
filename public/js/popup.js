// $500 welcome popup. Submits to /api/lead, which emails the visitor their
// code and notifies the owner. Shared by every storefront page; the markup
// lives inline in each page (#rwPopup).
(function () {
  var CODE = 'WAVE500';
  var SEEN = 'rw_pop';

  function el(id) { return document.getElementById(id); }

  window.rwClosePopup = function () {
    var p = el('rwPopup');
    if (p) p.style.display = 'none';
    try { sessionStorage.setItem(SEEN, '1'); } catch (e) {}
  };

  window.rwClaimOffer = function () {
    var nameEl = el('rwPopName'), emailEl = el('rwPopEmail');
    var name = (nameEl.value || '').trim();
    var email = (emailEl.value || '').trim();
    if (!name) { nameEl.style.borderColor = '#ef4444'; nameEl.focus(); return; }
    if (!email || email.indexOf('@') === -1) {
      emailEl.style.borderColor = '#ef4444'; emailEl.focus(); return;
    }

    var btn = el('rwClaimBtn');
    if (btn) { btn.textContent = 'Sending...'; btn.disabled = true; }

    function done() {
      var first = name.split(' ')[0];
      try {
        sessionStorage.setItem(SEEN, '1');
        sessionStorage.setItem('rw_name', first);
      } catch (e) {}
      if (el('rwStep1')) el('rwStep1').style.display = 'none';
      if (el('rwStep2')) el('rwStep2').style.display = 'block';
      if (el('rwGreet')) el('rwGreet').textContent = 'Hey ' + first + ', you are in!';
      if (el('rwSubMsg')) {
        el('rwSubMsg').textContent =
          'We emailed your code to ' + email + '. Enter ' + CODE +
          ' at checkout to take $500 off your first order.';
      }
      if (btn) { btn.textContent = 'Claim My $500 Code'; btn.disabled = false; }
    }

    fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'popup',
        name: name,
        email: email,
        page: window.location.href
      })
    }).then(done).catch(done);
  };

  window.rwCopyCode = function () {
    var btn = el('rwCopyBtn');
    function ok() {
      if (!btn) return;
      btn.textContent = 'Copied!';
      btn.style.background = '#22c55e';
      setTimeout(function () {
        btn.textContent = 'Copy Code';
        btn.style.background = '#ff7d1f';
      }, 2500);
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(CODE).then(ok).catch(ok);
    } else {
      var t = document.createElement('textarea');
      t.value = CODE;
      document.body.appendChild(t);
      t.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(t);
      ok();
    }
  };

  function boot() {
    var p = el('rwPopup');
    if (!p) return;
    // Backdrop click closes
    p.addEventListener('click', function (e) { if (e.target === p) window.rwClosePopup(); });
    var seen;
    try { seen = sessionStorage.getItem(SEEN); } catch (e) { seen = '1'; }
    if (seen) return;
    setTimeout(function () {
      if (!sessionStorage.getItem(SEEN)) p.style.display = 'flex';
    }, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
