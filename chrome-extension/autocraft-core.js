(() => {
  'use strict';
  function keySpec(value = '1') {
    const key = String(value).trim();
    if (/^[0-9]$/.test(key)) return { key, code: 'Digit' + key, windowsVirtualKeyCode: key.charCodeAt(0) };
    if (/^[a-z]$/i.test(key)) return { key: key.toLowerCase(), code: 'Key' + key.toUpperCase(), windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0) };
    if (/^F(?:[1-9]|1[0-2])$/i.test(key)) return { key: key.toUpperCase(), code: key.toUpperCase(), windowsVirtualKeyCode: 111 + Number(key.slice(1)) };
    throw Error('Use uma tecla de 0 a 9, A a Z ou F1 a F12.');
  }
  function settings(input = {}) {
    const value = { key: String(input.key ?? '1').trim(), recipe: String(input.recipe ?? '').trim(), intervalMs: input.intervalMs ?? 1000, waitMs: input.waitMs ?? 2500, buttonMs: input.buttonMs ?? 250, maxCycles: input.maxCycles ?? 0, extra: input.extra !== false };
    keySpec(value.key);
    if (value.recipe.length > 160) throw Error('Nome de receita muito longo.');
    for (const [name, min, max] of [['intervalMs', 200, 10000], ['waitMs', 500, 10000], ['buttonMs', 50, 2000], ['maxCycles', 0, 100000]]) {
      if (!Number.isInteger(value[name]) || value[name] < min || value[name] > max) throw Error('Tempo ou limite inválido: ' + name);
    }
    return value;
  }
  async function run({ config, probe, key, click, sleep, active, now = Date.now, progress = async () => {} }) {
    let cycles = 0, misses = 0;
    const result = reason => ({ reason, cycles, misses });
    const check = screen => { if (screen.kind === 'blocked') throw Error(screen.message || 'Janela de fabricação não reconhecida.'); return screen; };
    async function pause(ms) { for (let remaining = ms; remaining > 0 && active(); remaining -= 100) await sleep(Math.min(100, remaining)); }
    async function initial() {
      const deadline = now() + config.waitMs;
      do { if (!active()) return { kind: 'absent' }; const screen = check(await probe({ allowDetail: false })); if (screen.kind !== 'absent') return screen; await pause(100); } while (now() < deadline);
      return { kind: 'absent' };
    }
    async function transition(previous) {
      const deadline = now() + config.waitMs; let quietSince = null;
      do {
        if (!active()) return { kind: 'absent' };
        const screen = check(await probe({ allowDetail: true, previous }));
        if (screen.kind === 'absent') { quietSince ??= now(); if (now() - quietSince >= Math.min(500, config.waitMs - 100)) return screen; }
        else { quietSince = null; if (screen.signature !== previous.signature) return screen; }
        await pause(100);
      } while (now() < deadline);
      if (quietSince !== null) return { kind: 'absent' };
      throw Error('A janela não reagiu à confirmação. Pare e confira o jogo.');
    }
    while (active()) {
      if (config.maxCycles && cycles >= config.maxCycles) return result('limit');
      let screen = check(await probe({ allowDetail: false }));
      if (screen.kind === 'absent') {
        await progress({ cycles, misses, stage: 'Acionando skill' }); if (!active()) break;
        await key(keySpec(config.key)); screen = await initial();
        if (!active()) break;
        if (screen.kind === 'absent') { misses++; await progress({ cycles, misses, stage: 'Aguardando janela' }); if (misses >= 3) return result('no-dialog'); await pause(config.intervalMs); continue; }
      }
      if (screen.kind !== 'list') throw Error('Abra a seleção de receitas novamente antes de iniciar.');
      misses = 0;
      await progress({ cycles, misses, stage: 'Selecionando receita' }); if (!active()) break;
      await click(screen.item); await pause(config.buttonMs); if (!active()) break;
      screen = check(await probe({ allowDetail: true, previous: screen }));
      let confirmations = 0;
      while (active() && screen.kind !== 'absent') {
        if (!screen.confirm) throw Error('Botão de confirmação não encontrado.');
        if (confirmations >= (config.extra ? 3 : 1)) throw Error('Há outra etapa de fabricação. Confira a opção de confirmações extras.');
        await progress({ cycles, misses, stage: 'Confirmando fabricação' }); if (!active()) break;
        await click(screen.confirm); confirmations++; await pause(config.buttonMs);
        screen = await transition(screen);
      }
      if (!active()) break;
      cycles++; await progress({ cycles, misses, stage: 'Ciclo concluído' }); await pause(config.intervalMs);
    }
    return result('stopped');
  }
  globalThis.YggAuto = { settings, keySpec, run };
})();
