#ifndef MOTOR_DRIVER_H
#define MOTOR_DRIVER_H

#include <Arduino.h>

void initMotors();          // Khởi tạo chân Output
void goForward();           // Đi thẳng
void goBackward();          // Đi lùi
void turnLeft();            // Quay trái tại chỗ (Trái lùi - Phải tiến)
void turnRight();           // Quay phải tại chỗ (Trái tiến - Phải lùi)
void stopMoving();          // Dừng lại

#endif