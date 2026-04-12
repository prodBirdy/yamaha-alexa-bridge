const { SinricPro: SinricProClass, SinricProTV } = require('sinricpro');
const SinricPro = SinricProClass.getInstance();
const http = require('http');
const path = require('path');
const fs = require('fs');

// --- Load Configuration ---
const configPath = path.join(__dirname, 'config.json');

if (!fs.existsSync(configPath)) {
  console.error('ERROR: config.json not found.');
  console.error('Copy config.example.json to config.json and fill in your settings.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Validate config
const required = [
  ['yamaha.ip', config.yamaha?.ip],
  ['yamaha.zone', config.yamaha?.zone],
  ['sinricpro.appKey', config.sinricpro?.appKey],
  ['sinricpro.appSecret', config.sinricpro?.appSecret],
  ['sinricpro.deviceId', config.sinricpro?.deviceId],
];

for (const [name, value] of required) {
  if (!value || value.startsWith('YOUR_')) {
    console.error(`ERROR: "${name}" is not set in config.json.`);
    process.exit(1);
  }
}

const YAMAHA_IP = config.yamaha.ip;
const YAMAHA_ZONE = config.yamaha.zone;
const APP_KEY = config.sinricpro.appKey;
const APP_SECRET = config.sinricpro.appSecret;
const DEVICE_ID = config.sinricpro.deviceId;

// Map Alexa input names to Yamaha input IDs
const INPUT_MAP = config.yamaha.inputMap || {
  'HDMI 1':     'hdmi1',
  'HDMI 2':     'hdmi2',
  'HDMI 3':     'hdmi3',
  'HDMI 4':     'hdmi4',
  'AV 1':       'av1',
  'AV 2':       'av2',
  'AV 3':       'av3',
  'AUX':        'aux',
  'AUDIO 1':    'audio1',
  'AUDIO 2':    'audio2',
  'AUDIO 3':    'audio3',
  'USB':        'usb',
  'Bluetooth':  'bluetooth',
  'Spotify':    'spotify',
  'AirPlay':    'airplay',
  'TUNER':      'tuner',
  'NET RADIO':  'net_radio',
  'Server':     'server',
};

// --- Yamaha Receiver API ---
function yamahaGet(apiPath) {
  const url = `http://${YAMAHA_IP}/YamahaExtendedControl/v1${apiPath}`;
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Bad response from receiver: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function getYamahaStatus() {
  return yamahaGet(`/${YAMAHA_ZONE}/getStatus`);
}

async function setYamahaPower(on) {
  const state = on ? 'on' : 'standby';
  const result = await yamahaGet(`/${YAMAHA_ZONE}/setPower?power=${state}`);
  console.log(`[Yamaha] Power -> ${state}`);
  return result;
}

async function setYamahaVolume(percent) {
  const status = await getYamahaStatus();
  const maxVolume = status.max_volume || 161;
  const volume = Math.round((percent * maxVolume) / 100);
  const result = await yamahaGet(`/${YAMAHA_ZONE}/setVolume?volume=${volume}`);
  console.log(`[Yamaha] Volume -> ${percent}% (raw: ${volume}/${maxVolume})`);
  return result;
}

async function setYamahaMute(mute) {
  const result = await yamahaGet(`/${YAMAHA_ZONE}/setMute?enable=${mute}`);
  console.log(`[Yamaha] Mute -> ${mute}`);
  return result;
}

async function setYamahaInput(inputId) {
  const result = await yamahaGet(`/${YAMAHA_ZONE}/setInput?input=${inputId}`);
  console.log(`[Yamaha] Input -> ${inputId}`);
  return result;
}

async function setYamahaPlayback(action) {
  const result = await yamahaGet(`/netusb/setPlayback?playback=${action}`);
  console.log(`[Yamaha] Playback -> ${action}`);
  return result;
}

// --- Main ---
async function main() {
  console.log('=== Yamaha Alexa Bridge ===');
  console.log(`[Config] Receiver: ${YAMAHA_IP} (${YAMAHA_ZONE})`);

  // Test Yamaha connection
  try {
    const status = await getYamahaStatus();
    console.log(`[Yamaha] Connected. Power: ${status.power}, Volume: ${status.volume}/${status.max_volume}, Input: ${status.input}`);
  } catch (err) {
    console.error(`[Yamaha] Cannot reach receiver at ${YAMAHA_IP}: ${err.message}`);
    process.exit(1);
  }

  // Create TV device
  const receiver = SinricProTV(DEVICE_ID);

  // Power on/off
  receiver.onPowerState(async (deviceId, state) => {
    console.log(`[Alexa] Power: ${state ? 'ON' : 'OFF'}`);
    try {
      await setYamahaPower(state);
      return true;
    } catch (err) {
      console.error('[Alexa] Power failed:', err.message);
      return false;
    }
  });

  // Set volume (0-100)
  receiver.onVolume(async (deviceId, volume) => {
    console.log(`[Alexa] Volume: ${volume}`);
    try {
      await setYamahaVolume(volume);
      return true;
    } catch (err) {
      console.error('[Alexa] Volume failed:', err.message);
      return false;
    }
  });

  // Adjust volume (relative)
  receiver.onAdjustVolume(async (deviceId, delta) => {
    console.log(`[Alexa] Volume adjust: ${delta > 0 ? '+' : ''}${delta}`);
    try {
      const status = await getYamahaStatus();
      const maxVolume = status.max_volume || 161;
      const currentPercent = Math.round((status.volume / maxVolume) * 100);
      const newPercent = Math.max(0, Math.min(100, currentPercent + delta));
      await setYamahaVolume(newPercent);
      return true;
    } catch (err) {
      console.error('[Alexa] Volume adjust failed:', err.message);
      return false;
    }
  });

  // Mute/unmute
  receiver.onMute(async (deviceId, mute) => {
    console.log(`[Alexa] Mute: ${mute}`);
    try {
      await setYamahaMute(mute);
      return true;
    } catch (err) {
      console.error('[Alexa] Mute failed:', err.message);
      return false;
    }
  });

  // Media controls (play, pause, stop, next, previous)
  receiver.onMediaControl(async (deviceId, control) => {
    console.log(`[Alexa] Media: ${control}`);
    try {
      const controlMap = {
        'Play':           'play',
        'Pause':          'pause',
        'Stop':           'stop',
        'Next':           'next',
        'Previous':       'previous',
        'FastForward':    'fast_forward',
        'Rewind':         'fast_reverse',
      };
      const action = controlMap[control];
      if (action) {
        await setYamahaPlayback(action);
        return true;
      }
      console.log(`[Alexa] Unknown media control: ${control}`);
      return false;
    } catch (err) {
      console.error('[Alexa] Media control failed:', err.message);
      return false;
    }
  });

  // Input selection
  receiver.onSelectInput(async (deviceId, input) => {
    console.log(`[Alexa] Input: ${input}`);
    try {
      // Try exact match in input map first, then case-insensitive search
      let yamahaInput = INPUT_MAP[input];
      if (!yamahaInput) {
        const key = Object.keys(INPUT_MAP).find(k => k.toLowerCase() === input.toLowerCase());
        yamahaInput = key ? INPUT_MAP[key] : input.toLowerCase().replace(/\s+/g, '_');
      }
      await setYamahaInput(yamahaInput);
      return true;
    } catch (err) {
      console.error('[Alexa] Input switch failed:', err.message);
      return false;
    }
  });

  // Add device and connect
  SinricPro.add(receiver);

  SinricPro.onConnected(() => {
    console.log('[SinricPro] Connected. Waiting for Alexa commands...');
  });

  SinricPro.onDisconnected(() => {
    console.log('[SinricPro] Disconnected. Will reconnect automatically...');
  });

  await SinricPro.begin({ appKey: APP_KEY, appSecret: APP_SECRET });
}

main().catch(console.error);
