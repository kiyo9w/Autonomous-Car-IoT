#include "MotorDriver.h"
#include "PinConfig.h"


int speedToPWM(int speed) {
  return map(speed, 0, 100, 0, 255); 
}

void initMotors() {
  pinMode(PIN_LEFT_FWD, OUTPUT);
  pinMode(PIN_LEFT_BWD, OUTPUT);
  pinMode(PIN_RIGHT_FWD, OUTPUT);
  pinMode(PIN_RIGHT_BWD, OUTPUT);

  // Cấu hình tần số PWM (Core 3.x tự động xử lý khi gọi analogWrite, 
  // nhưng gọi analogWrite(pin, 0) để khởi tạo trạng thái ban đầu)
  stopMoving(); 
  Serial.println("✅ Motor Driver Ready (PWM Control Enabled)");
}

void goForward(int speed) {
  // 1. Kiểm tra Range
  if (speed < 1 || speed > 100) return;

  int pwm = speedToPWM(speed);

  // 2. Điều khiển motor
  // Trái tiến
  analogWrite(PIN_LEFT_FWD, pwm);
  digitalWrite(PIN_LEFT_BWD, LOW);
  
  // Phải tiến
  analogWrite(PIN_RIGHT_FWD, pwm);
  digitalWrite(PIN_RIGHT_BWD, LOW);

  Serial.printf(">>> FORWARD (Speed: %d%%)\n", speed);
}

void goBackward(int speed) {
  if (speed < 1 || speed > 100) return;

  int pwm = speedToPWM(speed);

  // Trái lùi
  digitalWrite(PIN_LEFT_FWD, LOW);
  analogWrite(PIN_LEFT_BWD, pwm);

  // Phải lùi
  digitalWrite(PIN_RIGHT_FWD, LOW);
  analogWrite(PIN_RIGHT_BWD, pwm);

  Serial.printf("<<< BACKWARD (Speed: %d%%)\n", speed);
}

void turnLeft(int speed) {
  if (speed < 1 || speed > 100) return;

  int pwm = speedToPWM(speed);

  // Trái lùi - Phải tiến
  digitalWrite(PIN_LEFT_FWD, LOW);
  analogWrite(PIN_LEFT_BWD, pwm); // Lùi

  analogWrite(PIN_RIGHT_FWD, pwm); // Tiến
  digitalWrite(PIN_RIGHT_BWD, LOW);

  Serial.printf("<- TURN LEFT (Speed: %d%%)\n", speed);
}

void turnRight(int speed) {
  if (speed < 1 || speed > 100) return;

  int pwm = speedToPWM(speed);

  // Trái tiến - Phải lùi
  analogWrite(PIN_LEFT_FWD, pwm); // Tiến
  digitalWrite(PIN_LEFT_BWD, LOW);

  digitalWrite(PIN_RIGHT_FWD, LOW);
  analogWrite(PIN_RIGHT_BWD, pwm); // Lùi

  Serial.printf("-> TURN RIGHT (Speed: %d%%)\n", speed);
}

void stopMoving() {
  // Ghi 0 vào tất cả các chân để dừng và cắt xung PWM
  digitalWrite(PIN_LEFT_FWD, LOW);
  digitalWrite(PIN_LEFT_BWD, LOW);
  digitalWrite(PIN_RIGHT_FWD, LOW);
  digitalWrite(PIN_RIGHT_BWD, LOW); // Dùng digitalWrite LOW thay vì analogWrite 0 cho chắc chắn
  Serial.printf("Stop");
}