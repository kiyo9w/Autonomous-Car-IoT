#include "CameraModule.h"
#include "CameraPins.h"
#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_server.h"

httpd_handle_t stream_httpd = NULL;

static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t * fb = NULL;
  esp_err_t res = ESP_OK;
  char part_buf[64];

  res = httpd_resp_set_type(req, "multipart/x-mixed-replace;boundary=frame");
  if(res != ESP_OK) return res;

  while(true) {
    fb = esp_camera_fb_get(); // Lấy ảnh
    if (!fb) {
      Serial.println("❌ Capture Fail (Kiem tra lai day cap/Lat mat day)");
      res = ESP_FAIL;
    } else {
      size_t hlen = snprintf(part_buf, 64, "\r\n--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", fb->len);
      res = httpd_resp_send_chunk(req, part_buf, hlen);
      if(res == ESP_OK) res = httpd_resp_send_chunk(req, (const char *)fb->buf, fb->len);
      esp_camera_fb_return(fb); // Trả bộ nhớ
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
  
  // CẤU HÌNH "CHẬM MÀ CHẮC"
  config.xclk_freq_hz = 10000000; // <--- GIẢM TỪ 20000000 XUỐNG 10000000
  config.frame_size = FRAMESIZE_QVGA;
  config.pixel_format = PIXFORMAT_JPEG; 
  config.grab_mode = CAMERA_GRAB_LATEST; 
  
  config.fb_location = CAMERA_FB_IN_PSRAM; 
  config.fb_count = 2;                  

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("❌ Init Failed!");
    return;
  }
  
  // BẬT TEST PATTERN
  sensor_t * s = esp_camera_sensor_get();
  s->set_colorbar(s, 1); // Bật sọc màu
  
  Serial.println("✅ Camera Ready (Test Mode: ColorBar)");
}

void startCameraServer(const char* ssid, const char* password) {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println("\n✅ WiFi Connected!");
  Serial.print("👉 LINK: http://");
  Serial.print(WiFi.localIP());
  Serial.println("/stream");

  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  httpd_uri_t stream_uri = { .uri = "/stream", .method = HTTP_GET, .handler = stream_handler, .user_ctx = NULL };
  if (httpd_start(&stream_httpd, &config) == ESP_OK) httpd_register_uri_handler(stream_httpd, &stream_uri);
}