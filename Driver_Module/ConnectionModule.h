/**
 * ConnectionModule.h - ESP-NOW Connection Handler for Rover
 *
 * This module handles:
 * - Receiving commands from Gateway via ESP-NOW
 * - Sending telemetry back to Gateway
 *
 * IMPORTANT: Motor actuation is separated from reception!
 * - Callback only stores command (no motor control)
 * - Main loop calls executeMotorCommand() after safety checks
 */

#ifndef CONNECTION_MODULE_H
#define CONNECTION_MODULE_H

#include <Arduino.h>

// Cấu trúc dữ liệu - PHẢI KHỚP VỚI GATEWAY
typedef struct __attribute__((packed)) command_struct {
  int x;
  int y;
} command_struct;

typedef struct __attribute__((packed)) feedback_struct {
  float voltage;
  int distance;
} feedback_struct;

/**
 * Khởi tạo ESP-NOW connection
 * Phải gọi sau WiFi.mode(WIFI_STA)
 */
void initConnection();

/**
 * Xử lý gửi telemetry định kỳ
 * @param voltage Điện áp pin (V)
 * @param distance Khoảng cách cảm biến siêu âm (cm)
 */
void handleConnection(float voltage, int distance);

/**
 * Lấy lệnh hiện tại đã nhận được
 */
command_struct getLastCommand();

/**
 * Thực thi lệnh điều khiển motor từ joystick
 * GỌI HÀM NÀY TỪ MAIN LOOP SAU KHI ĐÃ KIỂM TRA AN TOÀN!
 *
 * @param x Giá trị X (0-4095, center=2048)
 * @param y Giá trị Y (0-4095, center=2048)
 */
void executeMotorCommand(int x, int y);

/**
 * Lấy thời điểm nhận gói tin cuối cùng (millis)
 * Dùng để phát hiện mất kết nối
 */
unsigned long getLastPacketTime();

/**
 * Kiểm tra kết nối còn sống không
 * @param timeoutMs Thời gian timeout (ms), mặc định 500ms
 * @return true nếu đã nhận gói tin trong khoảng timeout
 */
bool isConnectionAlive(unsigned long timeoutMs = 500);

#endif // CONNECTION_MODULE_H
