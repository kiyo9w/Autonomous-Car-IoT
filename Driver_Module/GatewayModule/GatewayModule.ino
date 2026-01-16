/**
 * GatewayModule.ino - ESP32 Gateway (plugged into Mac via USB/CH340)
 *
 * Role: Bridge between Mac (Python) and Rover (ESP32-S3)
 * - Receives commands from Mac via USB Serial
 * - Forwards commands to Rover via ESP-NOW
 * - Receives telemetry from Rover via ESP-NOW
 * - Sends telemetry back to Mac via USB Serial
 *
 * Protocol:
 * - Single char commands: F (Forward), B (Back), L (Left), R (Right), S (Stop)
 * - Joystick commands: "X,Y\n" where X,Y are 0-4095 (center=2048)
 */

#include <WiFi.h>
#include <esp_now.h>

// ===========================================
// CẤU HÌNH - SỬA CÁC GIÁ TRỊ NÀY
// ===========================================

// MAC CỦA CON XE (Rover ESP32-S3)
// Lấy MAC bằng cách xem Serial output của Rover khi khởi động
uint8_t roverMAC[] = {0xE8, 0xF6, 0x0A, 0x83, 0x92, 0x08};

// WiFi credentials - PHẢI GIỐNG VỚI ROVER!
const char *WIFI_SSID = "Qua trung chien";
const char *WIFI_PASS = "12345678";

// Cấu trúc dữ liệu - PHẢI KHỚP VỚI ROVER
typedef struct __attribute__((packed)) command_struct {
  int x;
  int y;
  uint8_t speed;
} command_struct;

typedef struct __attribute__((packed)) feedback_struct {
  float voltage;
  int distance;
} feedback_struct;

command_struct myCommand;
feedback_struct myFeedback;
esp_now_peer_info_t peerInfo;

int currentSpeed = 100; // Default speed 100%

// ===========================================
// CALLBACK FUNCTIONS
// ===========================================

/**
 * Callback khi nhận dữ liệu từ Rover (Telemetry)
 * Signature cho ESP32 Core 3.x
 */
void OnDataRecv(const esp_now_recv_info_t *info, const uint8_t *incomingData,
                int len) {
  if (len != sizeof(feedback_struct))
    return;
  memcpy(&myFeedback, incomingData, sizeof(myFeedback));

  // Gửi về Mac qua Serial (Python sẽ parse chuỗi này)
  Serial.print("TELE:");
  Serial.print(myFeedback.voltage);
  Serial.print(",");
  Serial.println(myFeedback.distance);
}

/**
 * Callback khi gửi dữ liệu (ESP32 Core 3.x signature)
 */
void OnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
  // Debug output (uncomment if needed)
  // Serial.println(status == ESP_NOW_SEND_SUCCESS ? "TX OK" : "TX FAIL");
}

// ===========================================
// COMMAND PARSING
// ===========================================

/**
 * Parse input từ Serial và gửi command đến Rover
 */
void parseAndSendCommand(String input) {
  input.trim();
  if (input.length() == 0)
    return;

  // Trường hợp 0: Lệnh cập nhật tốc độ (SPEED:50)
  if (input.startsWith("SPEED:")) {
    int val = input.substring(6).toInt();
    currentSpeed = constrain(val, 0, 100);
    Serial.printf("SPEED SET: %d%%\n", currentSpeed);
    // Cập nhật struct và gửi ngay để Rover đồng bộ
    myCommand.speed = currentSpeed;
  }
  // Trường hợp 1: Lệnh đơn (F, B, L, R, S) - từ nút bấm
  else if (input.length() == 1) {
    char cmd = input.charAt(0);
    switch (cmd) {
    case 'F':
      myCommand.x = 2048;
      myCommand.y = 4095;
      break; // Forward
    case 'B':
      myCommand.x = 2048;
      myCommand.y = 0;
      break; // Backward
    case 'L':
      myCommand.x = 0;
      myCommand.y = 2048;
      break; // Left
    case 'R':
      myCommand.x = 4095;
      myCommand.y = 2048;
      break; // Right
    case 'S':
      myCommand.x = 2048;
      myCommand.y = 2048;
      break; // Stop
    default:
      return; // Ignore unknown commands
    }
    // Gán tốc độ hiện tại cho lệnh
    myCommand.speed = currentSpeed;
  }
  // Trường hợp 2: Lệnh Joystick "X,Y" - từ analog joystick
  else if (input.indexOf(',') > 0) {
    int commaIndex = input.indexOf(',');
    String xStr = input.substring(0, commaIndex);
    String yStr = input.substring(commaIndex + 1);

    myCommand.x = xStr.toInt();
    myCommand.y = yStr.toInt();

    // Validate range
    myCommand.x = constrain(myCommand.x, 0, 4095);
    myCommand.y = constrain(myCommand.y, 0, 4095);
    myCommand.speed = currentSpeed;
  } else {
    return; // Invalid format
  }

  // Gửi qua ESP-NOW đến Rover
  esp_err_t result =
      esp_now_send(roverMAC, (uint8_t *)&myCommand, sizeof(myCommand));

  if (result == ESP_OK) {
    Serial.printf("TX: X=%d Y=%d S=%d\n", myCommand.x, myCommand.y,
                  myCommand.speed);
  } else {
    Serial.println("TX FAIL");
  }
}

// ===========================================
// SETUP
// ===========================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================");
  Serial.println("   ESP32 GATEWAY - Initializing...");
  Serial.println("========================================\n");

  // 1. Kết nối WiFi để ĐỒNG BỘ KÊNH với Rover
  // 🔴 QUAN TRỌNG: Gateway và Rover phải cùng kênh WiFi để ESP-NOW hoạt động!
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  Serial.print("Syncing WiFi channel with Rover");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n✅ WiFi Connected! Channel: %d\n", WiFi.channel());
    Serial.printf("   IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n⚠️ WiFi failed - ESP-NOW may not work with Rover!");
  }

  // 2. In MAC address (để cấu hình bên Rover nếu cần)
  Serial.printf("📡 Gateway MAC: %s\n", WiFi.macAddress().c_str());

  // 3. Initialize ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("❌ ESP-NOW init failed!");
    return;
  }

  // 4. Đăng ký callback
  esp_now_register_send_cb(OnDataSent);
  esp_now_register_recv_cb(OnDataRecv);

  // 5. Thêm Rover là Peer
  memset(&peerInfo, 0, sizeof(peerInfo));
  memcpy(peerInfo.peer_addr, roverMAC, 6);
  peerInfo.channel = 0; // 0 = auto (dùng kênh WiFi hiện tại)
  peerInfo.encrypt = false;

  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("❌ Failed to add Rover peer");
    return;
  }

  Serial.printf("🎯 Target Rover MAC: %02X:%02X:%02X:%02X:%02X:%02X\n",
                roverMAC[0], roverMAC[1], roverMAC[2], roverMAC[3], roverMAC[4],
                roverMAC[5]);

  // 6. Khởi tạo lệnh dừng
  myCommand.x = 2048;
  myCommand.y = 2048;
  myCommand.speed = 100;

  Serial.println("\n========================================");
  Serial.println("   GATEWAY READY!");
  Serial.println("   Commands: F/B/L/R/S or X,Y (0-4095)");
  Serial.println("========================================\n");
}

// ===========================================
// MAIN LOOP
// ===========================================

void loop() {
  // Đọc từ Serial (Python gửi xuống)
  if (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    parseAndSendCommand(input);
  }
}
