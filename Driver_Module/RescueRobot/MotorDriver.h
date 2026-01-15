#ifndef MOTOR_DRIVER_H
#define MOTOR_DRIVER_H

#include <Arduino.h>

void initMotors();                      // Khởi tạo chân Output
void goForward(int speed);              // Đi thẳng (speed: 1-100)
void goBackward(int speed);             // Đi lùi (speed: 1-100)
void turnLeft(int speed);               // Quay trái (speed: 1-100)
void turnRight(int speed);              // Quay phải (speed: 1-100)
void stopMoving();                      // Dừng lại

#endif