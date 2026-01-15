/**
 * ConnectionModule.cpp - ESP-NOW Connection Handler for Rover
 *
 * Role: Handle bidirectional communication between Rover and Gateway
 * - Receive motor commands via ESP-NOW (STORE ONLY, no motor actuation)
 * - Send telemetry (voltage, distance) back to Gateway
 *
 * CRITICAL: Motor actuation is handled by main loop after safety checks!
 * The callback ONLY stores the command - it does NOT call motor functions.
 */

#include "ConnectionModule.h"
#include "MotorDriver.h"
#include <WiFi.h>
#include <esp_now.h>

// --- CẤU HÌNH ---
// 🔴 MAC CỦA CON GATEWAY (ESP32 cắm máy tính)
// Lấy MAC bằng cách chạy WiFi.macAddress() trên Gateway
static uint8_t gatewayMAC[] = {0x78, 0x1C, 0x3C, 0xE1, 0x0F, 0x0C};

// State variables
static command_struct recvCommand = {2048, 2048}; // Center = stop
static feedback_struct sendFeedback;
static esp_now_peer_info_t peerInfo;
static unsigned long lastTelemetryTime = 0;
static const unsigned long TELEMETRY_INTERVAL = 500; // 500ms = 2Hz

// Heartbeat tracking for signal loss detection
static unsigned long lastPacketTime = 0;

// Joystick threshold constants
static const int CENTER = 2048;
static const int THRESHOLD_HIGH = CENTER + 1000; // > 3048 = active
static const int THRESHOLD_LOW = CENTER - 1000;  // < 1048 = active

/**
 * Execute motor command based on joystick values
 *
 * QUAN TRỌNG: Hàm này được gọi từ main loop() SAU KHI đã kiểm tra an toàn!
 * KHÔNG được gọi trực tiếp từ callback ESP-NOW.
 *
 * @param x Giá trị X: 0=Full Left, 2048=Center, 4095=Full Right
 * @param y Giá trị Y: 0=Full Back, 2048=Center, 4095=Full Forward
 */
void executeMotorCommand(int x, int y) {
  // Debug output

  // Y-axis dominant (forward/backward)
  if (y > THRESHOLD_HIGH) {
    Serial.println("FORWARD");
    goForward();
  } else if (y < THRESHOLD_LOW) {
    Serial.println("BACKWARD");
    goBackward();
  }
  // X-axis for turning (when Y is neutral)
  else if (x < THRESHOLD_LOW) {
    Serial.println("LEFT");
    turnLeft();
  } else if (x > THRESHOLD_HIGH) {
    Serial.println("RIGHT");
    turnRight();
  }
  // Deadzone = stop
  else {
    stopMoving();
  }
}

/**
 * ESP-NOW Receive Callback (ESP32 Core 3.x signature)
 *
 * 🔴 CHỈ LƯU LỆNH, KHÔNG ĐIỀU KHIỂN MOTOR!
 * Việc điều khiển motor để loop() xử lý sau khi check an toàn.
 */
static void onDataRecv(const esp_now_recv_info_t *info,
                       const uint8_t *incomingData, int len) {
  if (len != sizeof(command_struct)) {
    Serial.printf("Wrong packet size: %d (expected %d)\n", len,
                  sizeof(command_struct));
    return;
  }

  // Chỉ lưu lệnh - KHÔNG gọi executeMotorCommand ở đây!
  memcpy(&recvCommand, incomingData, sizeof(recvCommand));

  // Cập nhật thời gian nhận gói tin (cho heartbeat failsafe)
  lastPacketTime = millis();

  // Debug: In ra lệnh nhận được
  Serial.printf("RX: X=%d Y=%d\n", recvCommand.x, recvCommand.y);
}

/**
 * ESP-NOW Send Callback (ESP32 Core 3.x signature)
 */
static void onDataSent(const wifi_tx_info_t *info,
                       esp_now_send_status_t status) {
  // Uncomment for debugging
  // Serial.println(status == ESP_NOW_SEND_SUCCESS ? "Telemetry OK" : "Telemetry
  // FAIL");
}

/**
 * Initialize ESP-NOW connection
 * Call this AFTER WiFi.mode(WIFI_STA) in main setup()
 */
void initConnection() {
  // Initialize ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("❌ ESP-NOW init failed!");
    return;
  }

  // Register callbacks
  esp_now_register_recv_cb(onDataRecv);
  esp_now_register_send_cb(onDataSent);

  // Add Gateway as peer
  memset(&peerInfo, 0, sizeof(peerInfo));
  memcpy(peerInfo.peer_addr, gatewayMAC, 6);
  peerInfo.channel = 0;
  peerInfo.encrypt = false;

  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("❌ Failed to add Gateway peer");
    return;
  }

  Serial.println("✅ ESP-NOW Connection Ready");
  Serial.printf("   Gateway MAC: %02X:%02X:%02X:%02X:%02X:%02X\n",
                gatewayMAC[0], gatewayMAC[1], gatewayMAC[2], gatewayMAC[3],
                gatewayMAC[4], gatewayMAC[5]);
}

/**
 * Handle periodic telemetry transmission
 * Call this in main loop() with actual sensor values
 */
void handleConnection(float voltage, int distance) {
  unsigned long now = millis();

  // Throttle telemetry to avoid flooding
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = now;

    sendFeedback.voltage = voltage;
    sendFeedback.distance = distance;

    esp_err_t result = esp_now_send(gatewayMAC, (uint8_t *)&sendFeedback,
                                    sizeof(sendFeedback));

    if (result != ESP_OK) {
      Serial.println("⚠️ Telemetry send failed");
    }
  }
}

/**
 * Get the last received command
 */
command_struct getLastCommand() { return recvCommand; }

/**
 * Get timestamp of last received packet
 * Used for heartbeat/signal loss detection
 */
unsigned long getLastPacketTime() { return lastPacketTime; }

/**
 * Check if connection is still alive
 * @param timeoutMs How long without packets before considered dead
 * @return true if received packet within timeout period
 */
bool isConnectionAlive(unsigned long timeoutMs) {
  // At startup, before first packet, consider alive to allow initialization
  if (lastPacketTime == 0)
    return true;

  return (millis() - lastPacketTime) < timeoutMs;
}