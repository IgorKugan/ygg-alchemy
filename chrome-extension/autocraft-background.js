/* The debugger transport accepts only fixed keyboard/mouse commands for a
 * manually started, active YggIdle tab. It never evaluates page scripts. */
(() => {
  'use strict';
  globalThis.createYggAutoBackend = chrome => {
    let job = null, ready, flight = Promise.resolve();
    const popup = sender => sender.id === chrome.runtime.id && sender.url === chrome.runtime.getURL('popup.html');
    const game = sender => { try { return new URL(sender.url).origin === 'https://jogo.yggidle.com.br' && Number.isInteger(sender.tab?.id); } catch { return false; } };
    const authorizedStop = (message, sender) => popup(sender) || (game(sender) && sender.tab.id === job?.tabId && (!message.id || message.id === job.id));
    const snapshot = current => ({ id: current.id, tabId: current.tabId, frameId: current.frameId, running: current.running, stage: current.stage, cycles: current.cycles, misses: current.misses, config: current.config, startedAt: current.startedAt, reason: current.reason || '' });
    async function persist(current) { if (job === current) await chrome.storage.local.set({ autocraft: snapshot(current) }); }
    async function initialize() {
      const { autocraft } = await chrome.storage.local.get('autocraft');
      if (autocraft?.running) {
        try { await chrome.debugger.detach({ tabId: autocraft.tabId }); } catch { /* Session already ended. */ }
        await chrome.storage.local.set({ autocraft: { ...autocraft, running: false, stage: 'Parado: extensão reiniciada. Inicie novamente.', reason: 'restart' } });
      }
    }
    async function stop(current, message = 'Autocraft parado.', reason = 'stopped') {
      if (!current) return { ok: true };
      current.cancelled = true; current.running = false;
      if (current.finishing) return current.finishing;
      clearTimeout(current.timer);
      current.finishing = (async () => {
        try { await current.attachPromise; } catch { /* Attach may have failed. */ }
        await flight;
        if (current.attached) { current.attached = false; try { await chrome.debugger.detach({ tabId: current.tabId }); } catch { /* Chrome may have detached first. */ } }
        current.stage = message; current.reason = reason; await persist(current);
        if (job === current) job = null;
        return { ok: true };
      })();
      return current.finishing;
    }
    function cancel(message, sender) { if (job && authorizedStop(message, sender)) job.cancelled = true; }
    function requireOwner(message, sender) {
      if (!job || !job.running || job.cancelled || job.id !== message.id || !game(sender) || job.tabId !== sender.tab.id || job.frameId !== sender.frameId) throw Error('Sessão de Autocraft inválida ou parada.');
      return job;
    }
    async function active(current) {
      if (job !== current || current.cancelled || !current.running) throw Error('Autocraft parado.');
      const tab = await chrome.tabs.get(current.tabId), [focused] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (new URL(tab.url).origin !== 'https://jogo.yggidle.com.br' || focused?.id !== current.tabId) throw Error('Mantenha a aba do jogo ativa durante o Autocraft.');
      if (job !== current || current.cancelled || !current.running) throw Error('Autocraft parado.');
    }
    async function input(current, operation) {
      const work = flight.then(async () => { await active(current); return operation({ tabId: current.tabId }); });
      flight = work.catch(() => {});
      try { await work; return { ok: true }; }
      catch (error) { await stop(current, error.message, 'error'); throw error; }
    }
    async function handle(message, sender) {
      ready ??= initialize(); await ready;
      if (!message || typeof message.type !== 'string') throw Error('Mensagem inválida.');
      if (message.type === 'AUTO_STATE') {
        if (!popup(sender)) throw Error('Origem não autorizada.');
        const { autocraft } = await chrome.storage.local.get('autocraft'); const { autoSettings } = await chrome.storage.local.get('autoSettings');
        return { ok: true, state: autocraft || null, settings: autoSettings || null };
      }
      if (message.type === 'AUTO_START') {
        if (!popup(sender)) throw Error('Inicie o Autocraft pelo botão da extensão.');
        const config = YggAuto.settings(message.config);
        if (!Number.isInteger(message.tabId) || message.tabId < 0) throw Error('Abra a extensão na aba do jogo.');
        const tab = await chrome.tabs.get(message.tabId), [focused] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (new URL(tab.url).origin !== 'https://jogo.yggidle.com.br' || focused?.id !== tab.id) throw Error('Abra a extensão na aba do YggIdle.');
        if (job) await stop(job, 'Sessão anterior encerrada.');
        const current = { id: crypto.randomUUID(), tabId: tab.id, frameId: null, running: true, cancelled: false, stage: 'Conectando ao jogo…', cycles: 0, misses: 0, config, startedAt: Date.now(), attached: false };
        job = current;
        try {
          current.attachPromise = chrome.debugger.attach({ tabId: tab.id }, '1.3'); await current.attachPromise; current.attached = true;
          if (current.cancelled) return stop(current);
          current.stage = 'Aguardando o cliente do jogo…';
          await chrome.storage.local.set({ autoSettings: config }); await persist(current);
          current.timer = setTimeout(() => { if (job === current && current.frameId === null) stop(current, 'O cliente não respondeu. Recarregue o jogo após atualizar a extensão e tente novamente.', 'no-client'); }, 4000);
          return { ok: true };
        } catch (error) {
          await stop(current, 'Não foi possível iniciar. Pare o Macro Maker/DevTools que estiver conectado e tente novamente. ' + error.message, 'attach-error');
          throw Error('Não foi possível conectar o teclado. Pare o Macro Maker/DevTools que estiver conectado e tente novamente.');
        }
      }
      if (message.type === 'AUTO_STOP') {
        if (!authorizedStop(message, sender)) throw Error('Origem não autorizada.');
        return stop(job);
      }
      if (message.type === 'AUTO_CLAIM') {
        if (!job || !job.running || job.cancelled || job.id !== message.id || !game(sender) || sender.tab.id !== job.tabId || job.frameId !== null) throw Error('Sessão indisponível.');
        job.frameId = sender.frameId; clearTimeout(job.timer); job.stage = 'Iniciando fabricação'; await persist(job);
        return { ok: true, config: job.config };
      }
      const current = requireOwner(message, sender);
      if (message.type === 'AUTO_KEY') {
        const spec = YggAuto.keySpec(current.config.key);
        return input(current, async target => {
          try { await chrome.debugger.sendCommand(target, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', ...spec }); }
          finally { await chrome.debugger.sendCommand(target, 'Input.dispatchKeyEvent', { type: 'keyUp', ...spec }); }
        });
      }
      if (message.type === 'AUTO_CLICK') {
        if (![message.x, message.y].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100000)) throw Error('Posição do botão inválida.');
        return input(current, async target => {
          const point = { x: message.x, y: message.y };
          await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', { type: 'mouseMoved', ...point, button: 'none' });
          if (current.cancelled) return;
          try { await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', buttons: 1, clickCount: 1 }); }
          finally { await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', buttons: 0, clickCount: 1 }); }
        });
      }
      if (message.type === 'AUTO_PROGRESS') {
        if (![message.cycles, message.misses].every(n => Number.isInteger(n) && n >= 0 && n <= 1e9) || typeof message.stage !== 'string') throw Error('Progresso inválido.');
        current.cycles = message.cycles; current.misses = message.misses; current.stage = message.stage.slice(0, 160); await persist(current); return { ok: true };
      }
      if (message.type === 'AUTO_FINISH') {
        const reason = ['limit', 'no-dialog', 'stopped', 'error'].includes(message.reason) ? message.reason : 'error';
        const text = reason === 'limit' ? 'Limite de ciclos concluído.' : reason === 'no-dialog' ? 'A janela não abriu após 3 tentativas. Os materiais podem ter acabado.' : reason === 'error' ? String(message.error || 'Confira a janela do jogo.').slice(0, 300) : 'Autocraft parado.';
        return stop(current, text, reason);
      }
      throw Error('Ação de Autocraft inválida.');
    }
    chrome.tabs?.onActivated?.addListener(info => { if (job?.running && info.tabId !== job.tabId) { job.cancelled = true; stop(job, 'Parado: outra aba foi ativada.', 'tab-change'); } });
    chrome.tabs?.onUpdated?.addListener((id, change) => { if (job?.running && id === job.tabId && (change.status === 'loading' || change.url)) { job.cancelled = true; stop(job, 'Parado: a aba do jogo foi recarregada ou navegou.', 'navigation'); } });
    chrome.tabs?.onRemoved?.addListener(id => { if (job?.running && id === job.tabId) { job.cancelled = true; stop(job, 'Parado: a aba foi fechada.', 'closed'); } });
    chrome.debugger?.onDetach?.addListener(target => { if (job?.running && target.tabId === job.tabId) { job.attached = false; job.cancelled = true; stop(job, 'A conexão de automação foi encerrada pelo Chrome.', 'detached'); } });
    return { handle, cancel };
  };
})();
