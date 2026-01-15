#include "MotorDriver.h"
#include "PinConfig.h"

void initMotors() {
  pinMode(PIN_LEFT_FWD, OUTPUT);
  pinMode(PIN_LEFT_BWD, OUTPUT);
  pinMode(PIN_RIGHT_FWD, OUTPUT);
  pinMode(PIN_RIGHT_BWD, OUTPUT);

  stopMoving(); // Đảm bảo xe dừng khi vừa khởi động
  Serial.println("✅ Motor Driver Ready (GPIO: 4,5,6,7)");
}

void goForward() {
  // Trái tiến + Phải tiến
  digitalWrite(PIN_LEFT_FWD, HIGH);
  digitalWrite(PIN_LEFT_BWD, LOW);
  digitalWrite(PIN_RIGHT_FWD, HIGH);
  digitalWrite(PIN_RIGHT_BWD, LOW);
  Serial.println(">>> FORWARD");
}

void goBackward() {
  // Trái lùi + Phải lùi
  digitalWrite(PIN_LEFT_FWD, LOW);
  digitalWrite(PIN_LEFT_BWD, HIGH);
  digitalWrite(PIN_RIGHT_FWD, LOW);
  digitalWrite(PIN_RIGHT_BWD, HIGH);
  Serial.println("<<< BACKWARD");
}

void turnLeft() {
  // Trái lùi + Phải tiến
  digitalWrite(PIN_LEFT_FWD, LOW);
  digitalWrite(PIN_LEFT_BWD, HIGH);
  digitalWrite(PIN_RIGHT_FWD, HIGH);
  digitalWrite(PIN_RIGHT_BWD, LOW);
  Serial.println("<- TURN LEFT");
}

void turnRight() {
  // Trái tiến + Phải lùi
  digitalWrite(PIN_LEFT_FWD, HIGH);
  digitalWrite(PIN_LEFT_BWD, LOW);
  digitalWrite(PIN_RIGHT_FWD, LOW);
  digitalWrite(PIN_RIGHT_BWD, HIGH);
  Serial.println("-> TURN RIGHT");
}

void stopMoving() {
  digitalWrite(PIN_LEFT_FWD, LOW);
  digitalWrite(PIN_LEFT_BWD, LOW);
  digitalWrite(PIN_RIGHT_FWD, LOW);
  digitalWrite(PIN_RIGHT_BWD, LOW);
  Serial.println("XXX STOP");
}