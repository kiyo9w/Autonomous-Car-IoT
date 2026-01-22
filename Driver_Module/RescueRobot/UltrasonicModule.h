/**
 * UltrasonicModule.h - Non-blocking HC-SR04 Driver
 * * Module này sử dụng State Machine để đo khoảng cách
 * mà KHÔNG dùng pulseIn() gây treo CPU.
 * Giúp Camera stream mượt mà đồng thời với việc đo đạc.
 */

#ifndef ULTRASONIC_MODULE_H
#define ULTRASONIC_MODULE_H

#include <Arduino.h>

/**
 * Khởi tạo chân GPIO cho cảm biến
 */
void initUltrasonic();

/**
 * Hàm cập nhật trạng thái cảm biến (Gọi liên tục trong loop)
 * @return true nếu vừa đo xong và có kết quả mới
 */
bool updateUltrasonic();

/**
 * Lấy khoảng cách đo được gần nhất (cm)
 * @return khoảng cách (0 - 400cm)
 */
int getDistance();

#endif