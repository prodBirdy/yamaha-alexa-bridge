const { SinricPro: SinricProClass, SinricProDimSwitch } = require('sinricpro');
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

  // Create dimmable switch device
  const receiver = SinricProDimSwitch(DEVICE_ID);

  // Handle power on/off from Alexa
  receiver.onPowerState(async (deviceId, state) => {
    console.log(`[Alexa] Power command: ${state ? 'ON' : 'OFF'}`);
    try {
      await setYamahaPower(state);
      return true;
    } catch (err) {
      console.error('[Alexa] Power command failed:', err.message);
      return false;
    }
  });

  // Handle volume (power level) from Alexa
  receiver.onPowerLevel(async (deviceId, powerLevel) => {
    console.log(`[Alexa] Volume command: ${powerLevel}%`);
    try {
      await setYamahaVolume(powerLevel);
      return true;
    } catch (err) {
      console.error('[Alexa] Volume command failed:', err.message);
      return false;
    }
  });

  // Handle relative volume adjustment
  receiver.onAdjustPowerLevel(async (deviceId, delta) => {
    console.log(`[Alexa] Volume adjust: ${delta > 0 ? '+' : ''}${delta}%`);
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
