(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fields = ['key', 'recipe', 'intervalMs', 'waitMs', 'buttonMs', 'maxCycles'];
  let busy = false, running = false;
  function render(state) {
    running = !!state?.running;
    $('autoStart').disabled = busy || running;
    $('autoStop').disabled = busy || !running;
    $('autoStatus').textContent = state ? `${state.stage} · ${state.cycles || 0} ciclos` : 'Pronto para iniciar na aba do jogo.';
  }
  async function send(message) {
    const result = await chrome.runtime.sendMessage(message);
    if (!result?.ok) throw Error(result?.error || 'Não foi possível atualizar o Autocraft.');
    return result;
  }
  $('autoStart').addEventListener('click', async () => {
    busy = true; $('autoStart').disabled = true;
    try {
      const config = {};
      for (const name of fields) config[name] = ['key', 'recipe'].includes(name) ? $('auto_' + name).value : Number($('auto_' + name).value);
      config.extra = $('auto_extra').checked;
      YggAuto.settings(config);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await send({ type: 'AUTO_START', tabId: tab?.id, config });
      render((await send({ type: 'AUTO_STATE' })).state);
    } catch (error) { $('autoStatus').textContent = error.message; }
    finally { busy = false; $('autoStart').disabled = running; $('autoStop').disabled = !running; }
  });
  $('autoStop').addEventListener('click', async () => {
    try { await send({ type: 'AUTO_STOP' }); render((await send({ type: 'AUTO_STATE' })).state); }
    catch (error) { $('autoStatus').textContent = error.message; }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.autocraft) render(changes.autocraft.newValue);
  });
  send({ type: 'AUTO_STATE' }).then(async result => {
    const { shopping } = await chrome.storage.local.get('shopping');
    const config = YggAuto.settings(result.settings || {});
    if (!result.settings && shopping?.list?.label && !/^Meu plano/i.test(shopping.list.label)) config.recipe = shopping.list.label.split(' · ')[0];
    for (const name of fields) $('auto_' + name).value = config[name];
    $('auto_extra').checked = config.extra;
    render(result.state);
  }).catch(error => { $('autoStatus').textContent = error.message; });
})();
