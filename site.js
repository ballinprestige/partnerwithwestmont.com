/* Westmont Sterling partner site: form enhancement only. No tracking, no cookies, no storage.
   Without this script every form still posts normally and the form host shows its own thank-you page. */
(function () {
  'use strict';
  if (!window.fetch || !window.FormData || !window.URLSearchParams) return;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var forms = document.querySelectorAll('form[data-enhance]');

  function clearErrors(form) {
    var old = form.querySelectorAll('.field-error, .form-alert');
    for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
    var bad = form.querySelectorAll('[aria-invalid]');
    for (var j = 0; j < bad.length; j++) {
      bad[j].removeAttribute('aria-invalid');
      var keep = (bad[j].getAttribute('data-describedby') || '').trim();
      if (keep) bad[j].setAttribute('aria-describedby', keep); else bad[j].removeAttribute('aria-describedby');
    }
  }

  function markError(el, message) {
    var id = el.id + '-error';
    var p = document.createElement('p');
    p.className = 'field-error';
    p.id = id;
    p.textContent = message;
    var host = el.closest('.field') || el.parentNode;
    host.appendChild(p);
    el.setAttribute('aria-invalid', 'true');
    var keep = (el.getAttribute('data-describedby') || '').trim();
    el.setAttribute('aria-describedby', (keep ? keep + ' ' : '') + id);
  }

  function showDone(form) {
    var box = document.createElement('div');
    box.className = 'form-done';
    box.setAttribute('role', 'status');
    box.setAttribute('tabindex', '-1');
    var p = document.createElement('p');
    p.textContent = 'Received. Kyle Reynolds replies within one business day.';
    var again = document.createElement('button');
    again.type = 'button';
    again.className = 'linklike';
    again.textContent = 'Send another';
    again.addEventListener('click', function () {
      form.reset();
      setSource(form);
      form.hidden = false;
      box.parentNode.removeChild(box);
      var first = form.querySelector('input:not([type="hidden"]):not([tabindex="-1"]), textarea, select');
      if (first) first.focus();
    });
    box.appendChild(p);
    box.appendChild(again);
    form.hidden = true;
    form.parentNode.insertBefore(box, form.nextSibling);
    box.focus();
  }

  function setSource(form) {
    var src = form.querySelector('input[name="source_page"]');
    if (src) src.value = window.location.href;
  }

  Array.prototype.forEach.call(forms, function (form) {
    setSource(form);
    var email = form.querySelector('input[name="email"]');
    var phone = form.querySelector('input[name="phone"]');
    // With the script on, email OR phone is enough; with it off, the browser requires email.
    if (email) email.removeAttribute('required');
    // Hints are written for the no-script case; swap in the script-on wording where one is given.
    var hints = form.querySelectorAll('[data-js-text]');
    for (var h = 0; h < hints.length; h++) hints[h].textContent = hints[h].getAttribute('data-js-text');
    form.setAttribute('novalidate', '');

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      clearErrors(form);
      var errors = [];

      var req = form.querySelectorAll('[data-required]');
      for (var i = 0; i < req.length; i++) {
        if (!req[i].value.trim()) errors.push([req[i], req[i].getAttribute('data-required')]);
      }
      var ev = email ? email.value.trim() : '';
      var pv = phone ? phone.value.trim() : '';
      if (email && phone && !ev && !pv) {
        errors.push([email, 'Add an email or a phone number so Kyle can reply.']);
      } else if (ev && !EMAIL_RE.test(ev)) {
        errors.push([email, 'Check the email address; it looks incomplete.']);
      }

      if (errors.length) {
        var alert = document.createElement('div');
        alert.className = 'form-alert';
        alert.setAttribute('role', 'alert');
        alert.textContent = errors.length === 1 ? 'One thing to fix before sending.' : errors.length + ' things to fix before sending.';
        form.insertBefore(alert, form.firstChild);
        errors.forEach(function (e) { markError(e[0], e[1]); });
        errors[0][0].focus();
        return;
      }

      setSource(form);
      var trap = form.querySelector('input[name="bot-field"]');
      if (trap && trap.value) { showDone(form); return; }

      var button = form.querySelector('button[type="submit"]');
      var label = button ? button.textContent : '';
      if (button) { button.disabled = true; button.textContent = 'Sending…'; }

      var body;
      try {
        body = new URLSearchParams(new FormData(form)).toString();
      } catch (err) {
        HTMLFormElement.prototype.submit.call(form);
        return;
      }

      // A stalled request (slow mobile link) falls back to a normal post after 15 seconds.
      var ctl = window.AbortController ? new AbortController() : null;
      var timer = ctl ? setTimeout(function () { ctl.abort(); }, 15000) : null;

      fetch(form.action, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body,
        signal: ctl ? ctl.signal : undefined
      }).then(function () {
        clearTimeout(timer);
        if (button) { button.disabled = false; button.textContent = label; }
        showDone(form);
      }).catch(function () {
        clearTimeout(timer);
        HTMLFormElement.prototype.submit.call(form);
      });
    });
  });
})();
