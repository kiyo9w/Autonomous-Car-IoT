# 🚑 Rescue Rover: AI-Powered Autonomous IoT Rescue System

> **CS 4445 Data Communication and Networking Project**
> *A low-cost, hybrid-intelligence robot designed for autonomous search and rescue operations.*

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Hardware](https://img.shields.io/badge/Hardware-ESP32--S3-green)](https://www.espressif.com/)
[![AI](https://img.shields.io/badge/AI-YOLOv8%20%7C%20Qwen2.5--VL-orange)](https://ultralytics.com/)
[![Python](https://img.shields.io/badge/Built%20with-Python%203.10-yellow)](https://www.python.org/)

---

## 👥 The Team
**Institution:** Hanoi University of Science and Technology & Troy University

| Name | Student ID | Role |
|------|------------|------|
| **Ngo Thanh Trung** | 1677469 | Team Leader / Firmware |
| **Pham Thai Duong** | 1677593 | AI Engineer / Cloud Computing |
| **Nguyen Duy Duc** | 1624838 | Hardware Design / Mechanics |
| **Le Quang Huy** | 1677645 | Frontend / Dashboard Integration |

---

## 🔭 Project Vision

**Rescue Rover** aims to democratize advanced robotics for disaster scenarios. Our vision is to create a system that bridges the gap between **low-cost IoT hardware** and **high-level Artificial Intelligence**.

By integrating **Edge Computing (ESP32)**, **Fog Computing (PC/YOLO)**, and **Cloud Intelligence (LLMs)**, we built a robot capable of navigating hazardous environments where human presence is risky. The system prioritizes low latency for control and high accuracy for decision-making.

---

## 🎥 Demos

> *See the Rescue Rover in action.*

| **Demo 1: Obstacle Avoidance (Reflex Layer)** | **Demo 2: AI Navigation (Strategic Layer)** |
|:-----------------------------------------------------:|:---------------------------------------------------:|
| [![Watch the video](https://img.youtube.com/vi/VIDEO_ID_HERE/0.jpg)](https://www.youtube.com/watch?v=VIDEO_ID_HERE) | [![Watch the video](https://img.youtube.com/vi/VIDEO_ID_HERE/0.jpg)](https://www.youtube.com/watch?v=VIDEO_ID_HERE) |
| *Fast reaction using ultrasonic sensors.* | *Complex pathfinding using Qwen2.5-VL.* |

---

## 🏗️ System Architecture

Our system utilizes a **Distributed Intelligence** architecture, separating tasks based on latency requirements and computational complexity.

### 1. Hardware ("The Body")
* **Brain:** ESP32-S3 WROOM (Dual-core, WiFi/BLE).
* **Motion:** L298N Motor Driver controlling a 4WD chassis.
* **Vision:** OV2640 Camera Module.
* **Sensors:** HC-SR04 Ultrasonic Sensor.
* **Gateway:** ESP32 connected to PC via USB (Serial/CH340) acting as the bridge.

### 2. Communication ("The Nervous System")
* **Control Link:** **ESP-NOW**. We chose this over standard WiFi for the control loop to achieve ultra-low latency (**2-5ms**). The PC sends commands to the Gateway, which broadcasts to the Rover via MAC Address.
* **Video Link:** **HTTP**. MJPEG streaming is used to transmit video from the Rover directly to the PC over WiFi.

### 3. Artificial Intelligence ("The Mind")
We implemented a **3-Layer Hybrid Intelligence** model:

| Layer | Component | Function | Latency |
| :--- | :--- | :--- | :--- |
| **Reflex** | **ESP32-S3** | Emergency braking (Hard Stop) if obstacle < 25cm. | < 10ms |
| **Tactical** | **PC (YOLOv8)** | Real-time object detection (People, debris) & steering. | ~30ms |
| **Strategic** | **Cloud (Qwen2.5-VL)** | Complex scene understanding & path planning. | > 500ms |

---

## 📸 Gallery

<p align="center">
  <img src="./images/system_architecture.png" alt="System Architecture" width="45%">
  <img src="./images/circuit_diagram.png" alt="Circuit Wiring" width="45%">
</p>
<p align="center">
  <b>Fig 1:</b> System Overview & Logic Flow &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>Fig 2:</b> Hardware Wiring Diagram
</p>

<br>

<p align="center">
  <img src="./images/real_prototype.jpg" alt="Real Rover" width="45%">
  <img src="./images/dashboard_ui.png" alt="Control Dashboard" width="45%">
</p>
<p align="center">
  <b>Fig 3:</b> Final Prototype Assembly &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>Fig 4:</b> PC Control Dashboard
</p>

---

## 🚀 Getting Started

### Prerequisites
* Python 3.10+
* Arduino IDE / PlatformIO
* ESP32 Board Manager

### Installation

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/kiyo9w/Autonomous-Car-IoT.git](https://github.com/kiyo9w/Autonomous-Car-IoT.git)
    cd Autonomous-Car-IoT
    ```

2.  **Firmware Setup:**
    * Flash `firmware/rover_code.ino` to the **ESP32-S3 (Robot)**.
    * Flash `firmware/gateway_code.ino` to the **ESP32 (Gateway)**.
    * *Note: Update the MAC Addresses in the code to match your boards.*

3.  **PC Controller Setup:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the System:**
    * Connect the Gateway ESP32 to the PC via USB.
    * Power on the Rover.
    * Start the Controller:
        ```bash
        python main_controller.py
        ```

---

## 📄 Reference
For detailed technical specifications, algorithms, and testing results, please refer to our full **[Project Report](./docs/Rescue_Rover_Report.pdf)**.

---
**© 2026 Rescue Rover Team.**
