# ESP32 Smart Gate – Backend

This repository contains the backend logic and firmware for the ESP32 Smart Gate system — a modern access control solution using an ESP32 microcontroller, a relay module, and a cloud-based PIN validation flow.

The backend is built using Cloudflare Workers and KV for serverless API logic and secure PIN storage. It also includes the Arduino firmware that runs on the ESP32 device.

---

## 🔌 What This Repo Includes

- **Cloudflare Worker source code** (TypeScript)
- **KV integration** for guest/admin PINs with expiration
- **API endpoints**:
  - `/open-barrier` — validates PIN and triggers the relay via Blynk
  - `/generate-pin` — authenticates admin and generates guest PINs
  - `/device-status` — returns ESP32 connection status
- **Arduino firmware** (`firmware/esp32-barrier.ino`)
  - Wi-Fi + Blynk setup
  - Relay pulse logic (GPIO 5)
  - Watchdog + auto-reset
  - Virtual pin trigger (V0)

---

## 🛠 Installation

Clone the repo:

```bash
git clone https://github.com/tinkeriotops/esp32-barrier-be.git
cd esp32-barrier-be
```

Install Wrangler CLI if you haven’t already:

```bash
npm install -g wrangler
wrangler login
```

---

## 🚀 Deploy the Worker

1. Create the KV namespace:

```bash
wrangler kv:namespace create PINS
```

2. Add the returned ID to `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "PINS"
id = "your-namespace-id"
```

3. Add your Blynk token:

```bash
wrangler secret put BLYNK_TOKEN
```

4. Deploy the Worker:

```bash
wrangler deploy
```

After deploy, you’ll get a URL like:

```
https://esp32-barrier-api.YOUR_NAME.workers.dev
```

Use this URL in your frontend configuration.

---

## 🔐 Add an Admin PIN

To generate guest PINs, you must set at least one admin PIN manually:

```bash
wrangler kv:key put 1234 9 --binding=PINS --remote
```

- `1234` = PIN code
- `9` = admin access level

Guest PINs are generated with type `1`.

---

## 📟 Firmware Setup

The firmware is located at:

```
firmware/esp32-barrier.ino
```

You’ll need:

- Arduino IDE
- ESP32 board package
- Wi-Fi SSID + password
- Blynk token
- Template ID and Template Name

Update these lines in the firmware:

```cpp
#define BLYNK_TEMPLATE_ID "TMPLxxxxxx"
#define BLYNK_TEMPLATE_NAME "SmartGate"

const char* ssid = "YourWiFi";
const char* password = "YourPass";
const char* blynkToken = "YourBlynkToken";
const int relayPin = 5;
```

Upload to your ESP32 via Arduino IDE. The device will connect to Blynk and wait for virtual pin `V0 = 1` to activate the relay.

---

## 📖 Full Build Guide

Read the full step-by-step tutorial, including hardware wiring, hosting, and deployment:

**[How I Built a Secure, Web-Based Smart Gate with ESP32](https://tinkeriot.com/esp32-smart-gate-access)**

---

## 🛡 License & Use

This code is provided for personal use only.  
Do not redistribute or republish any part of the system or firmware publicly.

---

## 🤝 Support

If this project saved you time or helped you build something great, support continued development:

[https://ko-fi.com/yourname](https://ko-fi.com/yourname)
