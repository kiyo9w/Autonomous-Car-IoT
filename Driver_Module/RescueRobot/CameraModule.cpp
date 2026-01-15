#include "CameraModule.h"
#include "CameraPins.h"
#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_server.h"

httpd_handle_t stream_httpd = NULL;

// Hàm xử lý luồng video (Stream Handler)
static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t * fb = NULL;
  esp_err_t res = ESP_OK;
  char part_buf[64];

  res = httpd_resp_set_type(req, "multipart/x-mixed-replace;boundary=frame");
  if(res != ESP_OK) return res;

  while(true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("❌ Lỗi: Không lấy được ảnh từ Camera!");
      res = ESP_FAIL;
    } else {
      size_t hlen = snprintf(part_buf, 64, "\r\n--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", fb->len);
      res = httpd_resp_send_chunk(req, part_buf, hlen);
      if(res == ESP_OK) res = httpd_resp_send_chunk(req, (const char *)fb->buf, fb->len);
      esp_camera_fb_return(fb);
    }
    if(res != ESP_OK) break;
  }
  return res;
}

void initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  
  // Tinh chỉnh cho N16R8 (Có PSRAM xịn)
  config.xclk_freq_hz = 20000000; // 20MHz
  config.pixel_format = PIXFORMAT_JPEG;
  
  // Kiểm tra xem PSRAM có thực sự hoạt động không
  if(psramFound()){
    config.frame_size = FRAMESIZE_HVGA; // PSRAM OK -> Dùng độ phân giải cao
    config.jpeg_quality = 30;          // Chất lượng tốt (số càng nhỏ càng nét)
    config.fb_count = 3;               // 2 bộ đệm để mượt hơn
    config.fb_location = CAMERA_FB_IN_PSRAM; // LƯU VÀO PSRAM
    Serial.printf("✅ Đã phát hiện PSRAM: %d MB. Cấu hình Camera chế độ HI-RES.\n", ESP.getPsramSize()/1024/1024);
  } else {
    config.frame_size = FRAMESIZE_QVGA; // Không có PSRAM -> Dùng ảnh nhỏ
    config.jpeg_quality = 12;
    config.fb_count = 1;
    config.fb_location = CAMERA_FB_IN_DRAM;
    Serial.println("⚠️ CẢNH BÁO: KHÔNG TÌM THẤY PSRAM! Chuyển sang chế độ Low-Res.");
  }

  // Khởi tạo Camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ Camera Init Failed! Error: 0x%x\n", err);
    Serial.println("👉 Gợi ý: Kiểm tra lại dây kết nối, đảm bảo không cắm trùng chân 4 & 5");
    return;
  }

  sensor_t * s = esp_camera_sensor_get();
  // Đảo ngược ảnh nếu camera bị treo ngược (tùy chọn)
  // s->set_vflip(s, 1); 
  // s->set_hmirror(s, 1);

  Serial.println("✅ Camera Init Success!");
}

void startCameraServer(const char* ssid, const char* password) {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected!");
  Serial.print("👉 CAMERA STREAM: http://");
  Serial.print(WiFi.localIP());
  Serial.println("/stream");

  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  httpd_uri_t stream_uri = { .uri = "/stream", .method = HTTP_GET, .handler = stream_handler, .user_ctx = NULL };
  
  if (httpd_start(&stream_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(stream_httpd, &stream_uri);
  }
}