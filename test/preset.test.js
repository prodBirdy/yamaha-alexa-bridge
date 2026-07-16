const assert = require('node:assert/strict');
const http = require('node:http');
const Module = require('node:module');
const test = require('node:test');

test('recalls a mapped Yamaha preset', async () => {
  let selectInput;
  let finish;
  const requestReceived = new Promise(resolve => finish = resolve);
  const server = http.createServer((req, res) => {
    res.end(JSON.stringify(req.url.endsWith('/getStatus')
      ? { power: 'on', volume: 50, max_volume: 161, input: 'hdmi1' }
      : { response_code: 0 }));
    if (!req.url.endsWith('/getStatus')) finish(req.url);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  const receiver = {
    onPowerState() {},
    onVolume() {},
    onAdjustVolume() {},
    onMute() {},
    onMediaControl() {},
    onSelectInput(callback) { selectInput = callback; },
  };
  const sinric = {
    add() {},
    onConnected() {},
    onDisconnected() {},
    async begin() {
      assert.equal(await selectInput('receiver', 'Favorite 5'), true);
    },
  };
  const originalLoad = Module._load;
  const originalExistsSync = require('node:fs').existsSync;
  const originalReadFileSync = require('node:fs').readFileSync;
  Module._load = function (request, parent, isMain) {
    if (request === 'sinricpro') {
      return {
        SinricPro: { getInstance: () => sinric },
        SinricProTV: () => receiver,
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  require('node:fs').existsSync = path => path.endsWith('config.json') || originalExistsSync(path);
  require('node:fs').readFileSync = (path, ...args) => path.endsWith('config.json')
    ? JSON.stringify({
      yamaha: {
        ip: `127.0.0.1:${server.address().port}`,
        zone: 'main',
        inputMap: { 'Favorite 5': 'preset:5' },
      },
      sinricpro: { appKey: 'test', appSecret: 'test', deviceId: 'test' },
    })
    : originalReadFileSync(path, ...args);

  try {
    require('../index.js');
    assert.equal(
      await Promise.race([
        requestReceived,
        new Promise((_, reject) => setTimeout(() => reject(new Error('No input request received')), 1000)),
      ]),
      '/YamahaExtendedControl/v1/netusb/recallPreset?zone=main&num=5',
    );
  } finally {
    Module._load = originalLoad;
    require('node:fs').existsSync = originalExistsSync;
    require('node:fs').readFileSync = originalReadFileSync;
    server.close();
  }
});
