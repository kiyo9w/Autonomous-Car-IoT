#ifndef CONNECTION_MODULE_H
#define CONNECTION_MODULE_H

#include <Arduino.h>

// --- CẤU TRÚC DỮ LIỆU (Phải giống hệt code bên Remote) ---
typedef struct command_struct {
  int x;
  int y;
  // int button; // Có thể thêm nút bấm nếu cần (ví dụ bật đèn)
} command_struct;

typedef struct feedback_struct {
  float voltage;
  int distance;
} feedback_struct;

// --- KHAI BÁO HÀM ---
void initESPNow(); // Khởi tạo kết nối
void sendFeedbackToRemote(float voltage, int distance); // Hàm gửi dữ liệu về Remote

#endif