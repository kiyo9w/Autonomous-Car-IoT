#include <esp_now.h>
#include <WiFi.h>

// --- CẤU HÌNH ---
// MAC CỦA CON XE: E8:F6:0A:83:92:08
uint8_t roverMAC[] = {0xE8, 0xF6, 0x0A, 0x83, 0x92, 0x08};

// Cấu trúc dữ liệu
typedef struct __attribute__((packed)) command_struct {
  int x;
  int y;
} command_struct;

typedef struct __attribute__((packed)) feedback_struct {
  float voltage;
  int distance;
} feedback_struct;

command_struct myCommand;
feedback_struct myFeedback;
esp_now_peer_info_t peerInfo;

// --- CALLBACK NHẬN DỮ LIỆU (Cập nhật cho Core 3.x) ---
void OnDataRecv(const uint8_t * mac, const uint8_t *incomingData, int len) {
  if (len != sizeof(feedback_struct)) return;
  memcpy(&myFeedback, incomingData, sizeof(myFeedback));
  
  Serial.print("Pin: "); Serial.print(myFeedback.voltage);
  Serial.print("V | Dist: "); Serial.println(myFeedback.distance);
}

// --- CALLBACK GỬI DỮ LIỆU (Đã sửa theo lỗi Compiler yêu cầu) ---
// Thư viện mới yêu cầu tham số đầu tiên là 'wifi_tx_info_t' thay vì 'uint8_t'
void OnDataSent(const wifi_tx_info_t *info, esp_now_send_status_t status) {
  // Bạn có thể lấy MAC từ: info->des_addr nếu cần
  // Serial.println(status == ESP_NOW_SEND_SUCCESS ? "Delivery Success" : "Delivery Fail");
}

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);

  if (esp_now_init() != ESP_OK) {
    Serial.println("Error initializing ESP-NOW");
    return;
  }

  // Đăng ký callback
  // Ép kiểu (void*) để tránh lỗi "invalid conversion" trên một số bản compiler khó tính
  esp_now_register_send_cb(OnDataSent);
  esp_now_register_recv_cb(esp_now_recv_cb_t(OnDataRecv));

  // Thêm Peer
  memset(&peerInfo, 0, sizeof(peerInfo));
  memcpy(peerInfo.peer_addr, roverMAC, 6);
  peerInfo.channel = 0;  
  peerInfo.encrypt = false;
  
  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("Failed to add peer");
    return;
  }

  // Khởi tạo lệnh dừng
  myCommand.x = 2048;
  myCommand.y = 2048;
  Serial.println("Remote Ready (Core 3.x)!");
}

void loop() {
  if (Serial.available()) {
    char cmd = Serial.read();
    if(cmd == '\n' || cmd == '\r' || cmd == ' ') return;

    if (cmd == 'F') { myCommand.x = 2048; myCommand.y = 4095; }
    else if (cmd == 'B') { myCommand.x = 2048; myCommand.y = 0; }
    else if (cmd == 'L') { myCommand.x = 0; myCommand.y = 2048; }
    else if (cmd == 'R') { myCommand.x = 4095; myCommand.y = 2048; }
    else if (cmd == 'S') { myCommand.x = 2048; myCommand.y = 2048; }
    
    // SỬA LỖI: Dùng đúng tên biến hệ thống là esp_err_t
    esp_err_t result = esp_now_send(roverMAC, (uint8_t *) &myCommand, sizeof(myCommand));
    
    if (result == ESP_OK) {
      Serial.print("Sent: "); Serial.println(cmd);
    } else {
      Serial.println("Send Fail");
    }
  }
}
