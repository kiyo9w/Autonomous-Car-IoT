#ifndef CAMERA_MODULE_H
#define CAMERA_MODULE_H
#include <Arduino.h>

void initCamera(); 
void startCameraServer(const char* ssid, const char* password);

#endif