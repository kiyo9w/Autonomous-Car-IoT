/**
 * RescueRobot.ino - Main firmware for Rescue Rover
 *
 * Hardware: ESP32-S3 with OV2640 camera, L298N motor driver, ultrasonic sensor
 *
 * Architecture (3-Layer Hybrid):
 * Layer 1 (Reactive): Ultrasonic emergency stop (<25cm) - runs on ESP32
 * Layer 2 (Tactical): YOLOv8 object detection - runs on Mac
 * Layer 3 (Strategic): VLM decision making - runs on Mac
 *
 * Communication:
 * - Video: UDP or HTTP stream to Mac
 * - Control: ESP-NOW from Gateway (Mac USB) -> Rover
 * - Telemetry: ESP-NOW from Rover -> Gateway -> Mac
 */

#include "CameraModule.h"
#include "CameraPins.h"
#include "ConnectionModule.h"
#include "MotorDriver.h"

// ===========================================
// CONFIGURATION - SỬA CÁC GIÁ TRỊ NÀY
// ===========================================

// WiFi credentials
const char *WIFI_SSID = "Qua trung chien";
const char *WIFI_PASS = "12345678";

// Chế độ streaming: true = UDP (nhanh, production), false = HTTP (dễ debug)
// HTTP mode: Access stream at http://<ESP32_IP>:81/stream in Chrome
// UDP mode: Requires Python receiver, lower latency for real-time control
const bool USE_UDP_STREAM = false; // 🌐 UDP mode for low latency

// IP máy Mac nhận video UDP (chỉ cần khi USE_UDP_STREAM = true)
// ⚠️ QUAN TRỌNG: IP này phải cùng subnet với ESP32!
// Nếu ESP32 có IP 172.20.10.x, Mac cũng phải là 172.20.10.x
// Xem IP bằng: Option + Click WiFi icon trên Mac
const char *MAC_IP = "172.20.10.3"; // Updated to host IP from logs
const int UDP_PORT = 9999;

// Ultrasonic sensor pins
#define TRIG_PIN 2
#define ECHO_PIN 3

// Safety thresholds
const int EMERGENCY_STOP_DISTANCE = 25; // cm - dừng khẩn cấp
const int SLOW_DOWN_DISTANCE = 50;      // cm - giảm tốc

// Heartbeat failsafe
const unsigned long SIGNAL_TIMEOUT = 500; // Stop if no command for 500ms

// Telemetry
const float BATTERY_VOLTAGE = 12.0; // Giả lập, sau này đọc từ ADC

// ===========================================
// STATE VARIABLES
// ===========================================

unsigned long lastDistanceRead = 0;
const int DISTANCE_READ_INTERVAL = 50; // 20Hz
int currentDistance = 999;
bool emergencyStopActive = false;

// ===========================================
// NON-BLOCKING ULTRASONIC SENSOR
// ===========================================

// State machine states
enum UltrasonicState {
  US_IDLE,
  US_TRIGGER_HIGH,
  US_WAIT_ECHO_START,
  US_WAIT_ECHO_END
};

static UltrasonicState usState = US_IDLE;
static unsigned long usTriggerTime = 0;
static unsigned long usEchoStart = 0;

/**
 * Non-blocking ultrasonic distance measurement
 * Uses state machine to avoid pulseIn() blocking the CPU
 * Call this every loop iteration - returns true when new reading available
 */
bool updateUltrasonicDistance() {
  unsigned long now = micros();

  switch (usState) {
  case US_IDLE:
    // Start trigger pulse
    digitalWrite(TRIG_PIN, HIGH);
    usTriggerTime = now;
    usState = US_TRIGGER_HIGH;
    break;

  case US_TRIGGER_HIGH:
    // End trigger after 10µs
    if (now - usTriggerTime >= 10) {
      digitalWrite(TRIG_PIN, LOW);
      usState = US_WAIT_ECHO_START;
    }
    break;

  case US_WAIT_ECHO_START:
    // Wait for echo pin to go HIGH
    if (digitalRead(ECHO_PIN) == HIGH) {
      usEchoStart = now;
      usState = US_WAIT_ECHO_END;
    }
    // Timeout after 30ms (no object)
    else if (now - usTriggerTime > 30000) {
      currentDistance = 999;
      usState = US_IDLE;
      return true;
    }
    break;

  case US_WAIT_ECHO_END:
    // Wait for echo pin to go LOW
    if (digitalRead(ECHO_PIN) == LOW) {
      unsigned long duration = now - usEchoStart;
      currentDistance = constrain((duration * 0.034) / 2, 0, 400);
      usState = US_IDLE;
      return true;
    }
    // Timeout after 30ms
    else if (now - usEchoStart > 30000) {
      currentDistance = 999;
      usState = US_IDLE;
      return true;
    }
    break;
  }
  return false;
}

/**
 * Unified Control Loop
 *
 * This is the "brain" of the rover that coordinates:
 * 1. Reading sensors
 * 2. Getting remote commands
 * 3. Checking safety constraints
 * 4. Executing motor commands (only if safe!)
 *
 * IMPORTANT: Motor actuation happens HERE, not in ESP-NOW callback.
 * This prevents the "fighting control" race condition.
 */
void handleControlLoop() {
  // 0. FAILSAFE: Check if connection is lost
  if (!isConnectionAlive(SIGNAL_TIMEOUT)) {
    static bool signalLostPrinted = false;
    if (!signalLostPrinted) {
      Serial.println("⚠️ SIGNAL LOST - EMERGENCY STOP!");
      signalLostPrinted = true;
    }
    stopMoving();
    return; // Skip all control logic until signal returns
  } else {
    static bool signalLostPrinted = false;
    signalLostPrinted = false; // Reset for next disconnect
  }

  // 1. Update distance sensor (non-blocking state machine)
  updateUltrasonicDistance();

  // 2. Get the latest command from ESP-NOW (stored by callback)
  command_struct cmd = getLastCommand();

  // 3. Analyze intent: Is rover trying to move FORWARD?
  // Y > 2500 means forward (center is ~2048)
  bool tryingToMoveForward = (cmd.y > 2500);
  bool isTurning = (cmd.x < 1000 || cmd.x > 3000); // Check for turn intent

  // 4. Decision Matrix
  bool isBlocked =
      (currentDistance < EMERGENCY_STOP_DISTANCE && tryingToMoveForward);

  // If blocked, only allow motion if turning (escape)
  if (isBlocked && !isTurning) {
    // 🛑 OBSTACLE DETECTED + TRYING TO GO STRAIGHT FORWARD = BLOCK!
    if (!emergencyStopActive) {
      Serial.printf("🚨 OBSTACLE at %d cm - BLOCKING FORWARD!\n",
                    currentDistance);
      emergencyStopActive = true;
    }
    stopMoving();
  } else {
    // ✅ SAFE - Execute the command normally (including escape turns)
    if (emergencyStopActive && isBlocked && isTurning) {
      Serial.println("📤 Escape maneuver allowed");
    }
    emergencyStopActive = false;
    executeMotorCommand(cmd.x, cmd.y, cmd.speed);
  }
}

// ===========================================
// SETUP
// ===========================================

void setup() {
  Serial.begin(115200);
  delay(1000); // Wait for serial

  Serial.println("\n========================================");
  Serial.println("   RESCUE ROVER - Initializing...");
  Serial.println("========================================\n");

  // Check PSRAM
  if (psramFound()) {
    Serial.printf("✅ PSRAM: %d MB\n", ESP.getPsramSize() / 1024 / 1024);
  } else {
    Serial.println("⚠️ WARNING: PSRAM not found! Camera may fail.");
  }

  // 1. Initialize Motors
  Serial.println("\n[1/4] Initializing Motors...");
  initMotors();

  // 2. Initialize Camera
  Serial.println("\n[2/4] Initializing Camera...");
  initCamera();

  // 3. Start WiFi + Video Stream
  Serial.println("\n[3/4] Starting Video Stream...");
  if (USE_UDP_STREAM) {
    startCameraUDP(WIFI_SSID, WIFI_PASS, MAC_IP, UDP_PORT);
  } else {
    startCameraServer(WIFI_SSID, WIFI_PASS);
  }

  // 4. Initialize ESP-NOW Connection (must be after WiFi)
  Serial.println("\n[4/4] Initializing ESP-NOW...");
  // Note: WiFi.mode() already called in camera module
  initConnection();

  // 5. Setup ultrasonic sensor
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  Serial.println("   RESCUE ROVER - Ready!");
}

// ===========================================
// MAIN LOOP
// ===========================================

void loop() {
  handleControlLoop();
  // 3. Telemetry
  // handleConnection(BATTERY_VOLTAGE, currentDistance);
}