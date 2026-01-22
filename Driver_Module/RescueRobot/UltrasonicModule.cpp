#include "UltrasonicModule.h"
#include "PinConfig.h"

// Các trạng thái của máy trạng thái
enum UltrasonicState {
  US_IDLE,
  US_TRIGGER_HIGH,
  US_WAIT_ECHO_START,
  US_WAIT_ECHO_END
};

// Biến nội bộ (Static để giấu kín trong module)
static UltrasonicState usState = US_IDLE;
static unsigned long usTriggerTime = 0;
static unsigned long usEchoStart = 0;
static int currentDistance = 0;

// Cấu hình giới hạn
const int MAX_DISTANCE_CM = 400;
const int TIMEOUT_MICROS = 30000; // 30ms timeout

void initUltrasonic() {
  pinMode(PIN_ULTRASONIC_TRIG, OUTPUT);
  pinMode(PIN_ULTRASONIC_ECHO, INPUT);
  
  digitalWrite(PIN_ULTRASONIC_TRIG, LOW);
  Serial.println("✅ Ultrasonic Sensor Initialized (Non-blocking mode)");
}

int getDistance() {
  return currentDistance;
}

bool updateUltrasonic() {
  unsigned long now = micros();

  switch (usState) {
    // 1. Bắt đầu kích xung Trigger
    case US_IDLE:
      digitalWrite(PIN_ULTRASONIC_TRIG, HIGH);
      usTriggerTime = now;
      usState = US_TRIGGER_HIGH;
      break;

    // 2. Giữ xung Trigger trong 10 micro giây
    case US_TRIGGER_HIGH:
      if (now - usTriggerTime >= 10) {
        digitalWrite(PIN_ULTRASONIC_TRIG, LOW);
        usState = US_WAIT_ECHO_START;
      }
      break;

    // 3. Chờ chân Echo lên mức HIGH (Bắt đầu phản hồi)
    case US_WAIT_ECHO_START:
      if (digitalRead(PIN_ULTRASONIC_ECHO) == HIGH) {
        usEchoStart = now;
        usState = US_WAIT_ECHO_END;
      }
      // Timeout nếu chờ quá lâu mà sensor không phản hồi
      else if (now - usTriggerTime > TIMEOUT_MICROS) {
        usState = US_IDLE; // Reset làm lại
      }
      break;

    // 4. Chờ chân Echo xuống mức LOW (Kết thúc phản hồi)
    case US_WAIT_ECHO_END:
      if (digitalRead(PIN_ULTRASONIC_ECHO) == LOW) {
        unsigned long duration = now - usEchoStart;
        
        // Tính khoảng cách: Distance = (Time * SpeedOfSound) / 2
        // SpeedOfSound = 0.034 cm/us
        int newDist = (duration * 0.034) / 2;
        
        // Lọc nhiễu: Chỉ cập nhật nếu giá trị hợp lý
        currentDistance = constrain(newDist, 0, MAX_DISTANCE_CM);
        
        usState = US_IDLE; // Về trạng thái chờ đo lần sau
        return true;       // Báo về là CÓ DỮ LIỆU MỚI
      }
      // Timeout
      else if (now - usEchoStart > TIMEOUT_MICROS) {
        currentDistance = 999; // Báo lỗi xa vô cực
        usState = US_IDLE;
        return true; 
      }
      break;
  }
  
  return false; // Chưa đo xong
}