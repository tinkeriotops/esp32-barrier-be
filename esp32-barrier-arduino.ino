#define BLYNK_TEMPLATE_ID "your blynk template id"
#define BLYNK_TEMPLATE_NAME "your blynk template name here"
#define BLYNK_AUTH_TOKEN "your blynk device token here"

#include "esp_bt.h"
#include "esp_bt_main.h"

#include <WiFi.h>
#include <BlynkSimpleEsp32.h>

char ssid[] = "wifi network name";
char pass[] = "wifi network password";

#define RELAY_PIN 5
#define RELAY_ACTIVE LOW

BlynkTimer timer;

unsigned long lastRebootTime = 0;
int disconnectCount = 0;

// === RELAY CONTROL ===
BLYNK_WRITE(V0) {
  if (param.asInt() == 1) {
    Serial.println("[Relay] Triggered via V0 → ON");
    digitalWrite(RELAY_PIN, RELAY_ACTIVE);
    timer.setTimeout(2000L, []() {
      digitalWrite(RELAY_PIN, !RELAY_ACTIVE);
      Blynk.virtualWrite(V0, 0);
      Serial.println("[Relay] Auto reset → OFF");
    });
  }
}

// === OPTIONAL: Wi-Fi Reset Trigger ===
BLYNK_WRITE(V1) {
  if (param.asInt() == 1) {
    Serial.println("[WiFi] Clearing saved config and restarting...");
    WiFi.disconnect(true, true); // Clear NVS config
    delay(1000);
    ESP.restart();
  }
}

// === WATCHDOG CONNECTION MONITOR ===
void checkConnections() {
  int rssi = WiFi.RSSI();
  Serial.printf("[WiFi] RSSI: %d dBm\n", rssi);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Disconnected. Reconnecting...");
    WiFi.disconnect();
    WiFi.begin(ssid, pass);
    disconnectCount++;
  }

  if (!Blynk.connected()) {
    Serial.println("[Blynk] Disconnected. Reconnecting...");
    Blynk.disconnect();
    delay(200);
    Blynk.connect();
    disconnectCount++;
  }

  if (disconnectCount >= 10) {
    Serial.println("[System] Too many disconnects. Rebooting...");
    delay(1000);
    ESP.restart();
  }
}

// === TIMED REBOOT EVERY 30 MIN ===
void checkUptimeReboot() {
  if (millis() - lastRebootTime >= 1800000UL) {
    Serial.println("[System] 30 minutes passed. Rebooting...");
    delay(1000);
    ESP.restart();
  }
}

void setup() {
  Serial.begin(115200);
  delay(100);

  // === Disable Bluetooth to free memory and save power ===
  esp_bt_controller_status_t btStatus = esp_bt_controller_get_status();
  if (btStatus == ESP_BT_CONTROLLER_STATUS_ENABLED || btStatus == ESP_BT_CONTROLLER_STATUS_IDLE) {
    btStop();
  }

  WiFi.mode(WIFI_STA); // Station mode only (no SoftAP)

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, !RELAY_ACTIVE); // Ensure relay is OFF at boot
  Serial.println("[Setup] Relay initialized OFF");

  Serial.print("[WiFi] Connecting to ");
  Serial.println(ssid);
  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);

  timer.setInterval(30000L, checkConnections);    // Watchdog
  timer.setInterval(60000L, checkUptimeReboot);   // Periodic reboot

  lastRebootTime = millis();
  Serial.println("[Setup] System ready.");
}

void loop() {
  Blynk.run();
  timer.run();
}
