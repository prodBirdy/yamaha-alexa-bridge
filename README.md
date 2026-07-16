# Yamaha Alexa Bridge

Control your Yamaha MusicCast receiver with Alexa voice commands after Yamaha deprecated their native Alexa skill.

**Voice commands:**
- "Alexa, turn on Receiver" / "turn off Receiver"
- "Alexa, set Receiver volume to 30"
- "Alexa, turn up Receiver" / "turn down Receiver"
- "Alexa, mute Receiver" / "unmute Receiver"
- "Alexa, pause Receiver" / "resume Receiver" / "stop Receiver"
- "Alexa, next on Receiver" / "previous on Receiver"
- "Alexa, switch Receiver input to HDMI 1"
- "Alexa, Radio Vorarlberg" (with an Alexa routine)

## How It Works

```
Alexa  -->  Sinric Pro Cloud  -->  This Bridge (your PC)  -->  Yamaha Receiver
              (WebSocket)              (HTTP API)
```

A small Node.js script runs on your PC and connects to Sinric Pro via WebSocket. When you give Alexa a voice command, Sinric Pro forwards it to the script, which sends the corresponding command to your Yamaha receiver over your local network.

## Compatible Receivers

Any Yamaha receiver with **MusicCast** support (Yamaha Extended Control / YXC API). This includes most network-enabled Yamaha receivers from 2017 onwards:

- RX-V series (RX-V483, RX-V485, RX-V583, RX-V585, RX-V683, RX-V685, etc.)
- RX-A series (RX-A680, RX-A780, RX-A880, RX-A1080, RX-A2080, RX-A3080, etc.)
- Other MusicCast-enabled models

**To verify your receiver is compatible**, open a browser and go to:
```
http://YOUR_RECEIVER_IP/YamahaExtendedControl/v1/main/getStatus
```
If you see JSON with power, volume, and input fields, your receiver is compatible.

## Prerequisites

- **Node.js 18 or later** - Download from https://nodejs.org
- **A computer that stays on** - Windows PC, Mac, or Linux (the bridge must be running to receive commands)
- **Receiver and computer on the same local network**
- **Sinric Pro account** (free tier, supports up to 3 devices)
- **Amazon Alexa** with the Sinric Pro skill

## Setup

### Step 1: Sinric Pro Account

1. Create a free account at https://sinric.pro
2. Go to **Devices** -> **Add Device**
3. Set the device type to **TV**
4. Name it what you want Alexa to call it (e.g., "Receiver", "Stereo", "Yamaha")
5. Save and copy the **Device ID** from the device page
6. Go to **Credentials** -> create a new App Key if you don't have one
7. Copy the **App Key** and **App Secret**

### Step 2: Link Sinric Pro to Alexa

1. Open the **Alexa app** on your phone
2. Go to **More** -> **Skills & Games**
3. Search for **Sinric Pro**
4. **Enable** the skill and sign in with your Sinric Pro account
5. Say "Alexa, discover my devices" or use the Alexa app to discover devices

### Step 3: Find Your Receiver's IP Address

Check your router's admin page for connected devices, or look in your receiver's network settings menu. 

**Important:** Assign a static IP or DHCP reservation for your receiver so the IP doesn't change.

### Step 4: Install the Bridge

1. Download or clone this repository
2. Open a terminal/command prompt in the project folder
3. Install dependencies:
   ```
   npm install
   ```
4. Copy the example config:
   ```
   copy config.example.json config.json
   ```
5. Edit `config.json` with your settings:
   ```json
   {
     "yamaha": {
       "ip": "192.168.0.75",
       "zone": "main"
     },
     "sinricpro": {
       "appKey": "your-app-key-here",
       "appSecret": "your-app-secret-here",
       "deviceId": "your-device-id-here"
     }
   }
   ```
6. Test it:
   ```
   npm start
   ```
   You should see:
   ```
   === Yamaha Alexa Bridge ===
   [Yamaha] Connected. Power: on, Volume: 53/161, Input: audio1
   [SinricPro] Connected. Waiting for Alexa commands...
   ```
7. Try a voice command: "Alexa, turn on Receiver"

### Step 5: Run as a Windows Service (Optional)

To keep the bridge running in the background and start it automatically on boot:

1. Download **NSSM** from https://nssm.cc/download
2. Extract `nssm.exe` and place it in this folder (or add it to your system PATH)
3. Right-click `install-service.bat` -> **Run as Administrator**
4. The service "Yamaha Alexa Bridge" will start automatically

To remove the service later, right-click `uninstall-service.bat` -> **Run as Administrator**.

Service logs are written to `service.log` in this folder.

## Configuration

| Field | Description |
|---|---|
| `yamaha.ip` | Your receiver's IP address on the local network |
| `yamaha.zone` | Zone to control: `main`, `zone2`, `zone3`, or `zone4` |
| `yamaha.inputMap` | (Optional) Custom mapping of Alexa input names to Yamaha input IDs. See `config.example.json` for defaults. |
| `sinricpro.appKey` | App Key from Sinric Pro Credentials page |
| `sinricpro.appSecret` | App Secret from Sinric Pro Credentials page |
| `sinricpro.deviceId` | Device ID from your Sinric Pro device page |

## Voice Commands

| Command | What it does |
|---|---|
| "Alexa, turn on Receiver" | Powers on the receiver |
| "Alexa, turn off Receiver" | Puts receiver in standby |
| "Alexa, set Receiver volume to 30" | Sets volume to 30% |
| "Alexa, turn up Receiver" | Increases volume |
| "Alexa, turn down Receiver" | Decreases volume |
| "Alexa, mute Receiver" | Mutes the receiver |
| "Alexa, unmute Receiver" | Unmutes the receiver |
| "Alexa, pause Receiver" | Pauses playback (Spotify, etc.) |
| "Alexa, resume Receiver" | Resumes playback |
| "Alexa, stop Receiver" | Stops playback |
| "Alexa, next on Receiver" | Next track |
| "Alexa, previous on Receiver" | Previous track |
| "Alexa, switch Receiver input to HDMI 1" | Switches to HDMI 1 |
| "Alexa, switch Receiver input to Spotify" | Switches to Spotify |
| "Alexa, switch Receiver input to Bluetooth" | Switches to Bluetooth |
| "Alexa, Radio Vorarlberg" | Recalls the preset assigned by an Alexa routine |

## Volume Mapping

Yamaha receivers use an internal volume scale (typically 0-161). This bridge converts Alexa's percentage (0-100%) to the receiver's scale:

| Alexa Command | Percentage | Approx. Receiver Volume |
|---|---|---|
| "Set volume to 20" | 20% | 32/161 |
| "Set volume to 30" | 30% | 48/161 |
| "Set volume to 50" | 50% | 81/161 |

## Input Mapping

The bridge maps input names received from Sinric Pro to Yamaha input IDs. The default map covers common inputs. To customize it, add an `inputMap` to your `config.json`:

```json
{
  "yamaha": {
    "ip": "192.168.0.75",
    "zone": "main",
    "inputMap": {
      "HDMI 1": "hdmi1",
      "GAME": "hdmi2",
      "PHONO": "audio1"
    }
  }
}
```

The keys must be input names that Alexa and Sinric Pro already recognize. `inputMap` translates incoming names but does not register new voice names with Alexa.

### Preset Mapping

Map an unused Alexa input name to `preset:1` through `preset:40` to recall a Yamaha MusicCast favorite:

```json
"inputMap": {
  "INPUT 1": "preset:13"
}
```

The direct command is then: "Alexa, switch Receiver input to Input 1".

#### Friendly voice names with Alexa routines

Use an Alexa routine to hide the technical input name behind a natural phrase:

1. In the Alexa app, open **More > Routines** and add a routine.
2. Under **When this happens**, choose **Voice** and enter `Radio Vorarlberg`.
3. Add an action under **Smart Home > Receiver** that changes the input to `INPUT 1`.
4. If input selection is not offered as a Smart Home action, use a **Custom** action with `Switch Receiver input to Input 1`.
5. Save the routine.

Now say: "Alexa, Radio Vorarlberg". Repeat this with a different unused, [Alexa-supported input name](https://developer.amazon.com/en-US/docs/alexa/device-apis/alexa-inputcontroller.html#input-property-values) for each preset. This keeps friendly names in Alexa and the preset numbers in `config.json`.

To list the presets stored on your receiver, open:

```
http://YOUR_RECEIVER_IP/YamahaExtendedControl/v1/netusb/getPresetInfo
```

## Troubleshooting

| Problem | Solution |
|---|---|
| "Cannot reach receiver" | Check the IP in config.json. Make sure the receiver is powered on (not standby). Try opening `http://RECEIVER_IP/YamahaExtendedControl/v1/main/getStatus` in a browser. |
| "config.json not found" | Copy `config.example.json` to `config.json` and fill in your settings. |
| Alexa says "device not responding" | Make sure the bridge is running. Check that Sinric Pro credentials are correct. Re-enable the Sinric Pro skill in the Alexa app. |
| Volume seems too loud/quiet | Adjust the percentage. 30% is a comfortable listening level for most setups. |
| Service won't install | Make sure you right-click the .bat file and select "Run as Administrator". |
| Want to control Zone 2 | Change `yamaha.zone` to `"zone2"` in config.json. |
| Input switching doesn't work | Check that the input name matches one in your `inputMap`. Run `http://RECEIVER_IP/YamahaExtendedControl/v1/system/getNameText` to see available inputs. |

## Support

If this project helped you, consider buying me a coffee:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-yellow?logo=buy-me-a-coffee)](https://buymeacoffee.com/afarmerinjapan)

## License

MIT
