#include "CameraPins.h"
#include "MotorDriver.h"
#include "CameraModule.h" 

// Tên Wifi và Mật khẩu
const char* WIFI_SSID = "Qua trung chien"; 
const char* WIFI_PASS = "12345678";

void setup() {
  Serial.begin(115200);
  delay(1000); // Chờ ổn định

  Serial.println("=== SYSTEM CHECK ===");
  if(psramFound()){
    Serial.printf("PSRAM: %d MB\n", ESP.getPsramSize()/1024/1024);
  } else {
    Serial.println("⚠️ CẢNH BÁO: Chưa bật PSRAM!");
  }

  // 1. Khởi động Motor
  initMotors();
  
  // 2. Khởi động Camera
  initCamera();

  // 3. KẾT NỐI WIFI VÀ BẬT CAMERA SERVER (ĐOẠN NÀY ĐANG THIẾU)
  //startCameraServer(WIFI_SSID, WIFI_PASS); 
}

void loop() {
  // Để trống loop để tập trung test Camera trước
  // Sau này mới thêm code điều khiển xe
  delay(1000);
}