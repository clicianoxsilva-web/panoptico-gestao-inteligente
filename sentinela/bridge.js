(function () {
  'use strict';
  var SERVICE = 'https://script.google.com/macros/s/AKfycbxsOnPxChTdSKDy0rj1tEPLYw6zH6thQ_ZMrNY_ogbnCEZmxyZ5k4BKVtHgI2K-a6j4eg/exec';
  var source = document.currentScript && document.currentScript.src;
  var ROOT = new URL('./', source || location.href).href;
  var allowed = new Set(['gate', 'v903Login', 'v903Open', 'v903Rpc', 'v903Logout']);
  var target = new URL(ROOT);
  if (location.origin !== target.origin || !location.pathname.startsWith(target.pathname)) return;

  function transform(html) {
    if (typeof html !== 'string' || !/<html[\s>]/i.test(html)) throw Error('A tela do Sentinela não foi recebida.');
    html = html.split(SERVICE).join(ROOT).split('SENTINELA V90.3').join('SENTINELA V90.12');
    if (html.includes('id="loginForm"') && !html.includes('Emblema da Polícia Penal')) {
      html=html.replace(/<article([^>]*)>/i,function(article){return article+'<img src="'+ROOT+'icon.svg" alt="Emblema da Polícia Penal do Maranhão" style="width:108px;height:132px;object-fit:contain;margin-bottom:14px">';});
    }
    var boot = '<title>SENTINELA | Polícia Penal do Maranhão</title><base href="' + ROOT + '"><meta name="theme-color" content="#031822"><meta name="referrer" content="no-referrer"><link rel="manifest" href="' + ROOT + 'manifest.webmanifest"><link rel="icon" href="' + ROOT + 'icon.svg"><link rel="apple-touch-icon" href="' + ROOT + 'icon.svg"><script src="' + ROOT + 'bridge.js?v=9012.1"><\/script>';
    return html.replace(/<head([^>]*)>/i, function (head) { return head + boot; });
  }

  async function rpc(method, args) {
    if (!allowed.has(method) || !Array.isArray(args)) throw Error('Operação não permitida.');
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 90000);
    try {
      var response = await fetch(SERVICE, {
        method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store', redirect: 'follow', referrerPolicy: 'no-referrer',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ method: method, args: args }), signal: controller.signal
      });
      if (!response.ok) throw Error('Não foi possível conectar ao Sentinela. Tente novamente.');
      var data;
      try { data = await response.json(); } catch (_) { throw Error('O servidor não retornou uma resposta válida. Tente novamente.'); }
      if (!data || data.ok !== true) throw Error(String(data && data.error || 'Não foi possível concluir a operação.').slice(0, 400));
      return method === 'gate' || method === 'v903Open' ? transform(data.value) : data.value;
    } catch (error) {
      if (error.name === 'AbortError') throw Error('O servidor demorou a responder. Tente novamente.');
      throw error;
    } finally { clearTimeout(timeout); }
  }

  function runner(ok, bad, user) {
    return new Proxy({}, { get: function (_, method) {
      if (method === 'withSuccessHandler') return function (fn) { return runner(fn, bad, user); };
      if (method === 'withFailureHandler') return function (fn) { return runner(ok, fn, user); };
      if (method === 'withUserObject') return function (object) { return runner(ok, bad, object); };
      if (typeof method !== 'string') return undefined;
      return function () {
        var args = Array.from(arguments);
        rpc(method, args).then(function (value) { if (ok) ok(value, user); }).catch(function (error) {
          if (bad) bad(error, user); else console.error('SENTINELA: ' + error.message);
        });
      };
    }});
  }

  function exportURL(value) {
    try {
      var u = new URL(value, ROOT), upstream = new URL(SERVICE);
      return u.origin === upstream.origin && u.pathname === upstream.pathname && u.searchParams.get('sentinelaExport') === 'v903' && /^[a-f0-9]{64}$/.test(u.searchParams.get('ticket') || '') ? u : null;
    } catch (_) { return null; }
  }

  async function downloadCSV(url) {
    try {
      var response = await fetch(url.href, { mode: 'cors', credentials: 'omit', cache: 'no-store', redirect: 'follow', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(90000) });
      if (!response.ok || !(response.headers.get('content-type') || '').includes('csv')) throw Error('Não foi possível baixar o CSV. Gere o relatório novamente.');
      var blob = await response.blob(), object = URL.createObjectURL(blob), anchor = document.createElement('a');
      anchor.href = object; anchor.download = 'SENTINELA_indicadores.csv';
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(function () { URL.revokeObjectURL(object); }, 60000);
    } catch (error) { alert(error.message || 'Não foi possível concluir o download.'); }
  }

  window.google = { script: { run: runner() } };
  if (!window.__sentinelaOriginalOpen) window.__sentinelaOriginalOpen = window.open.bind(window);
  window.open = function (url) {
    var csv = exportURL(url);
    if (csv) { downloadCSV(csv); return null; }
    return window.__sentinelaOriginalOpen.apply(window, arguments);
  };
  if (window.__sentinelaClicks) window.__sentinelaClicks.abort();
  window.__sentinelaClicks = new AbortController();
  document.addEventListener('click', function (event) {
    var anchor = event.target.closest && event.target.closest('a[href]');
    var csv = anchor && exportURL(anchor.href);
    if (csv) { event.preventDefault(); event.stopImmediatePropagation(); downloadCSV(csv); }
  }, { capture: true, signal: window.__sentinelaClicks.signal });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register(ROOT + 'sw.js', { scope: ROOT }).catch(function () {});

  if (document.getElementById('sentinela-loading')) {
    if (new URL(location.href).searchParams.get('instalar') === '1') { location.replace(ROOT + 'instalar.html'); return; }
    rpc('gate', []).then(function (html) {
      document.open(); document.write(html); document.close();
    }).catch(function (error) {
      var status = document.getElementById('sentinela-status');
      if (status) status.textContent = error.message || 'Não foi possível conectar ao Sentinela.';
      var retry = document.getElementById('sentinela-retry');
      if (retry) retry.hidden = false;
    });
  }
}());
