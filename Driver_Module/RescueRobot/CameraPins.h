#ifndef CAMERA_PINS_H
#define CAMERA_PINS_H

// --- SỬA LỖI XUNG ĐỘT CHÂN 10 ---

// 1. Chân nguồn & Reset
#define PWDN_GPIO_NUM     -1  // Nếu mạch Freenove/Clone thì thường là -1
#define RESET_GPIO_NUM    -1

// 2. Chân Clock (SỬA TỪ 10 SANG 15 ĐỂ TRÁNH TRÙNG Y5)
#define XCLK_GPIO_NUM     15  

// 3. Chân I2C (Giao tiếp lệnh)
#define SIOD_GPIO_NUM     4   // SDA
#define SIOC_GPIO_NUM     5   // SCL

// 4. Các chân dữ liệu (Data Pins)
#define Y9_GPIO_NUM       16
#define Y8_GPIO_NUM       17
#define Y7_GPIO_NUM       18
#define Y6_GPIO_NUM       12
#define Y5_GPIO_NUM       10  // Chân 10 dùng cho Y5 (nên XCLK phải đi chỗ khác)
#define Y4_GPIO_NUM       8
#define Y3_GPIO_NUM       9
#define Y2_GPIO_NUM       11

// 5. Chân đồng bộ hình ảnh
#define VSYNC_GPIO_NUM    6
#define HREF_GPIO_NUM     7
#define PCLK_GPIO_NUM     13

#endif