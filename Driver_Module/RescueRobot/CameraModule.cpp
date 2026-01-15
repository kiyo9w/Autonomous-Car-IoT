/**
 * CameraModule.cpp - Camera driver for ESP32-S3
 *
 * Supports two streaming modes:
 * 1. HTTP MJPEG - For browser viewing and debugging
 * 2. UDP Stream - For low-latency AI processing
 *
 * Hardware: OV2640 camera on ESP32-S3 with PSRAM
 */

#include "CameraModule.h"
#include "CameraPins.h"
#include "esp_camera.h"
#include "esp_http_server.h"
#include <WiFi.h>
#include <WiFiUdp.h>

// State
static bool cameraReady = false;
static bool udpMode = false;
static WiFiUDP udp;
static const char *udpTargetIP = nullptr;
static int udpTargetPort = 9999;
static httpd_handle_t stream_httpd = NULL;

// UDP packet size limit (safe value for local WiFi)
static const int UDP_MAX_PACKET = 1400;

/**
 * HTTP MJPEG Stream Handler
 * Serves continuous JPEG frames as multipart response
 */
static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t *fb = NULL;
  esp_err_t res = ESP_OK;
  char part_buf[64];

  res = httpd_resp_set_type(req, "multipart/x-mixed-replace;boundary=frame");
  if (res != ESP_OK)
    return res;

  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("❌ Capture failed");
      res = ESP_FAIL;
    } else {
      size_t hlen = snprintf(part_buf, 64,
                             "\r\n--frame\r\nContent-Type: "
                             "image/jpeg\r\nContent-Length: %u\r\n\r\n",
                             fb->len);
      res = httpd_resp_send_chunk(req, part_buf, hlen);
      if (res == ESP_OK) {
        res = httpd_resp_send_chunk(req, (const char *)fb->buf, fb->len);
      }
      esp_camera_fb_return(fb);
    }
    if (res != ESP_OK)
      break;
  }
  return res;
}

/**
 * Initialize camera hardware
 */
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

  // Conservative settings for stability
  config.xclk_freq_hz = 10000000;     // 10MHz (reduced from 20MHz)
  config.frame_size = FRAMESIZE_QVGA; // 320x240
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_LATEST;
  config.jpeg_quality =
      30; // 0-63, higher = smaller files, better for UDP (<1.4KB)

  // Use PSRAM for frame buffers
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.fb_count = 2;

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("❌ Camera init failed!");
    cameraReady = false;
    return;
  }

  // Disable test pattern for real images
  sensor_t *s = esp_camera_sensor_get();
  s->set_colorbar(s, 0); // 0 = real image, 1 = test pattern

  cameraReady = true;
  Serial.println("✅ Camera Ready (QVGA 320x240)");
}

/**
 * Connect to WiFi
 */
static bool connectWiFi(const char *ssid, const char *password) {
  Serial.printf("Connecting to WiFi: %s", ssid);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected!");
    Serial.print("   IP: ");
    Serial.println(WiFi.localIP());
    return true;
  } else {
    Serial.println("\n❌ WiFi Failed!");
    return false;
  }
}

/**
 * Start HTTP MJPEG server
 */
void startCameraServer(const char *ssid, const char *password) {
  if (!connectWiFi(ssid, password))
    return;

  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  httpd_uri_t stream_uri = {.uri = "/stream",
                            .method = HTTP_GET,
                            .handler = stream_handler,
                            .user_ctx = NULL};

  if (httpd_start(&stream_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(stream_httpd, &stream_uri);
    Serial.println("✅ HTTP Camera Server Started");
    Serial.printf("   Stream URL: http://%s/stream\n",
                  WiFi.localIP().toString().c_str());
  } else {
    Serial.println("❌ Failed to start HTTP server");
  }

  udpMode = false;
}

/**
 * Start UDP video streaming
 * Lower latency than HTTP, better for AI processing
 */
void startCameraUDP(const char *ssid, const char *password,
                    const char *targetIP, int targetPort) {
  if (!connectWiFi(ssid, password))
    return;

  udpTargetIP = targetIP;
  udpTargetPort = targetPort;
  udp.begin(targetPort);

  Serial.println("✅ UDP Camera Stream Started");
  Serial.printf("   Target: %s:%d\n", targetIP, targetPort);

  udpMode = true;
}

/**
 * Send one frame via UDP
 * Call this in loop() when using UDP mode
 *
 * Note: Large frames may be fragmented. For production use,
 * implement proper chunking protocol.
 */
void streamFrameUDP() {
  if (!cameraReady || !udpMode || udpTargetIP == nullptr)
    return;

  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("❌ UDP capture failed");
    return;
  }

  // Simple approach: Send entire frame (works on local WiFi)
  // For reliability, implement chunking with sequence numbers
  udp.beginPacket(udpTargetIP, udpTargetPort);
  udp.write(fb->buf, fb->len);
  udp.endPacket();

  esp_camera_fb_return(fb);
}

/**
 * Check if camera is ready
 */
bool isCameraReady() { return cameraReady; }

/**
 * Get current IP address
 */
String getCameraIP() {
  if (WiFi.status() == WL_CONNECTED) {
    return WiFi.localIP().toString();
  }
  return "0.0.0.0";
}