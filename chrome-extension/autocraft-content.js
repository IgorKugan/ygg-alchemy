(() => {
  'use strict';
  let state = null, attempted = null, token = null;
  async function send(message) {
    const response = await chrome.runtime.sendMessage(message);
    if (!response?.ok) throw Error(response?.error || 'A extensão não respondeu.');
    return response;
  }
  function stop() {
    if (!token || token.cancelled) return;
    token.cancelled = true;
    send({ type: 'AUTO_STOP', id: token.id }).catch(() => {});
  }
  async function start(command) {
    attempted = command.id;
    const local = { id: command.id, cancelled: false }; token = local;
    try {
      const { config } = await send({ type: 'AUTO_CLAIM', id: command.id });
      const active = () => token === local && !local.cancelled && state?.id === local.id && state.running && !document.hidden;
      if (!active()) { if (state?.id === local.id && state.running) stop(); return; }
      const request = (type, values = {}) => send({ type, id: local.id, ...values });
      const result = await YggAuto.run({
        config, active,
        probe: options => YggAutoDOM.inspect(document, config.recipe, options),
        key: () => { YggAutoDOM.focusGame(document); return request('AUTO_KEY'); },
        click: target => {
          target.element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          return request('AUTO_CLICK', YggAutoDOM.point(target));
        },
        sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
        progress: values => request('AUTO_PROGRESS', values)
      });
      if (active()) await request('AUTO_FINISH', result);
    } catch (error) {
      if (local && !local.cancelled && state?.id === local.id && state.running) {
        await send({ type: 'AUTO_FINISH', id: local.id, reason: 'error', error: error.message }).catch(() => {});
      }
    } finally { if (token === local) token = null; }
  }
  // Only fresh commands start a run. Stored sessions never resume on reload.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.autocraft) return;
    state = changes.autocraft.newValue;
    if (state?.running && state.frameId === null && state.id !== attempted && YggAutoDOM.ready(document)) start(state);
  });
  window.addEventListener('keydown', event => { if (event.key === 'Escape') stop(); }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
})();
