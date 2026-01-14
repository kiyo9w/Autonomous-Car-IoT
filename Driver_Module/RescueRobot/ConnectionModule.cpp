#include "ConnectionModule.h"
#include <esp_now.h>
#include <WiFi.h>
#include "MotorDriver.h" // Gọi module Motor để điều khiển

// 🔴 QUAN TRỌNG: ĐIỀN MAC CỦA CON REMOTE (CH340) VÀO ĐÂY
// Ví dụ: {0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF}
uint8_t remoteMAC[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF}; 

command_struct recvCommand;
feedback_struct sendFeedback;
esp_now_peer_info_t peerInfo;

// --- HÀM XỬ LÝ KHI NHẬN LỆNH ---
void OnDataRecv(const esp_now_recv_info_t * info, const uint8_t *incomingData, int len) {
  memcpy(&recvCommand, incomingData, sizeof(recvCommand));
  
  // Debug (chỉ mở khi cần thiết để tránh làm chậm Cam)
  // Serial.printf("Cmd: X=%d, Y=%d\n", recvCommand.x, recvCommand.y);

  // --- LOGIC ĐIỀU KHIỂN MOTOR ---
  // Giả sử Joystick trả về giá trị từ -100 đến 100
  // Vùng chết (Deadzone) là 30 để tránh trôi cần
  int threshold = 30;

  if (recvCommand.y > threshold) {
    goForward();
  } 
  else if (recvCommand.y < -threshold) {
    goBackward();
  } 
  else if (recvCommand.x < -threshold) { // Trái
    turnLeft();
  } 
  else if (recvCommand.x > threshold) { // Phải
    turnRight();
  } 
  else {
    stopMoving();
  }
}

// --- HÀM XỬ LÝ KHI GỬI PHẢN HỒI ---
void OnDataSent(const wifi_tx_info_t *info, esp_now_send_status_t status) {
  // Callback này để biết gói tin phản hồi có đến nơi không
  // Không nên Serial.print nhiều ở đây khi đang Stream Cam
}

void initESPNow() {
  // Lưu ý: Wifi mode đã được CameraModule set là AP_STA hoặc AP
  // Chúng ta không set lại WiFi.mode(WIFI_STA) ở đây để tránh mất Camera

  if (esp_now_init() != ESP_OK) {
    Serial.println("❌ Lỗi khởi tạo ESP-NOW");
    return;
  }

  // Đăng ký hàm xử lý
  esp_now_register_recv_cb(OnDataRecv); // Khi nhận lệnh -> Điều khiển xe
  esp_now_register_send_cb(OnDataSent); // Khi gửi phản hồi

  // Đăng ký Remote là Peer (Đối tác)
  memcpy(peerInfo.peer_addr, remoteMAC, 6);
  peerInfo.channel = 0;  // 0: Dùng kênh hiện tại của Wifi (tránh xung đột với Cam)
  peerInfo.encrypt = false;
  
  if (esp_now_add_peer(&peerInfo) != ESP_OK){
    Serial.println("⚠️ Không tìm thấy Remote (Kiểm tra lại MAC Address)");
  } else {
    Serial.println("✅ ESP-NOW Ready! Đang chờ lệnh từ Remote...");
  }
}

void sendFeedbackToRemote(float voltage, int distance) {
  sendFeedback.voltage = voltage;
  sendFeedback.distance = distance;
  esp_now_send(remoteMAC, (uint8_t *) &sendFeedback, sizeof(sendFeedback));
}