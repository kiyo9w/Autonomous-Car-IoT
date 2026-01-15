/**
 * CameraModule.h - Camera driver for ESP32-S3
 *
 * Supports two streaming modes:
 * 1. HTTP MJPEG (default) - Compatible with browsers, higher latency
 * 2. UDP Stream - Lower latency for AI processing
 */

#ifndef CAMERA_MODULE_H
#define CAMERA_MODULE_H

#include <Arduino.h>

/**
 * Initialize camera hardware
 * Must be called before any camera operations
 */
void initCamera();

/**
 * Start WiFi and HTTP MJPEG server
 * Access stream at http://<IP>/stream
 */
void startCameraServer(const char *ssid, const char *password);

/**
 * Start WiFi and UDP video streaming
 * Sends JPEG frames to specified IP:port
 * @param ssid WiFi network name
 * @param password WiFi password
 * @param targetIP IP address of receiving computer
 * @param targetPort UDP port (default 9999)
 */
void startCameraUDP(const char *ssid, const char *password,
                    const char *targetIP, int targetPort = 9999);

/**
 * Send one frame via UDP
 * Call this in loop() when using UDP mode
 */
void streamFrameUDP();

/**
 * Check if camera is ready
 */
bool isCameraReady();

/**
 * Get current WiFi IP address as string
 */
String getCameraIP();

#endif // CAMERA_MODULE_H