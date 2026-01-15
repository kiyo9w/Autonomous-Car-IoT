# Rescue-Rover 2: System Architecture & Repository Documentation

## 1. Project Overview
**Rescue-Rover 2** is a hybrid-architecture robotic platform designed for search and rescue operations. It implements a **3-Layer Control Architecture**:
1.  **Layer 1 (Reactive):** Firmware-level emergency braking via ultrasonic sensors (ESP32).
2.  **Layer 2 (Tactical):** Object detection and telemetry aggregation (Python/Mac).
3.  **Layer 3 (Strategic):** High-level decision making via VLM (Vision Language Model) stubs (Python/LLM).

The system solves the "high-bandwidth video vs. low-latency control" trade-off by splitting the transport layer:
* **Video:** Transmitted via **UDP/WiFi** (High Bandwidth) directly from Rover to Host.
* **Control:** Transmitted via **ESP-NOW** (Low Latency) using a dedicated USB Gateway dongle.

---

## 2. Repository Structure

### A. Host Application (`/RoverInterface`)
The host application serves as the Mission Control Center. It runs on a PC/Mac, interfaces with the USB Gateway, and renders the UI.

* **`app.py`**: The application entry point using **NiceGUI**.
    * **Serial Bridge (`RoverSerial`):** Manages the USB serial connection to the ESP32 Gateway. Auto-detects CH340/CP2102 drivers. Handles bidirectional communication (commands up, telemetry down).
    * **Video Pipeline:** Integrates the `FrameBuffer`. Exposes MJPEG streams via FastAPI for the UI (`/api/video`).
    * **API Layer:** Provides REST endpoints (`/api/control`, `/api/evidence`) for external agents or UI interactions.
* **`camera_reassembler.py` (`FrameBuffer` class)**:
    * A thread-safe video ingest engine.
    * **Modes:** Supports `UDP` (raw packet ingest), `HTTP` (MJPEG stream consumption), and `Webcam` (local debug).
    * **Logic:** Reassembles fragmented UDP packets into OpenCV images, then re-encodes to JPEG for the UI. Handles "Signal Lost" state logic.
* **`llm_worker.py`**:
    * A stubbed background thread designed to feed current frames to a Vision Language Model (e.g., Gemini/Ollama).
    * Currently mocks analysis with a confidence score and movement command.
* **`evidence_api.py`**:
    * Handles the retrieval of "evidence" (high-res captures or logs) from the rover storage (stubbed implementation).

### B. Driver Module - Rover Firmware (`/Driver_Module`)
Firmware for the customized ESP32-S3 robot.

* **`RescueRobot.ino` (Main Entry)**:
    * **Unified Control Loop:** The "Brain." It aggregates sensor data and remote commands.
    * **Reflexive Safety:** Intercepts forward movement commands if the ultrasonic sensor reads < 25cm. Allows "Escape Maneuvers" (Reverse/Turn) even when blocked.
    * **Non-Blocking Ultrasonic:** Uses a custom state machine (`US_IDLE`, `US_TRIGGER_HIGH`, etc.) to read HC-SR04 sensors without the blocking `pulseIn()` function.
* **`CameraModule.cpp`**:
    * Drivers for **OV2640**.
    * Configured for **QVGA (320x240)** to maximize UDP throughput.
    * **Dual-Stack:** Can switch between HTTP Server (easier debug) and UDP Stream (production speed).
* **`ConnectionModule.cpp`**:
    * Handles **ESP-NOW** peer registration.
    * **Heartbeat Monitor:** Implements a failsafe; if no packet is received for 500ms (`SIGNAL_TIMEOUT`), the rover auto-stops.
    * Decouples command *reception* from *execution* to prevent race conditions.

### C. Driver Module - Gateway Firmware (`/Driver_Module/GatewayModule.cpp`)
Firmware for the secondary ESP32 connected to the Host PC.

* **Role:** Protocol Translator. Converts USB Serial JSON/Strings from Python into ESP-NOW packets.
* **Channel Sync:** Scans WiFi to find the Rover's channel to ensure ESP-NOW connectivity.
* **Command Parsing:**
    * **Digital:** Characters `F`, `B`, `L`, `R`, `S`.
    * **Analog:** String parsing for `X,Y` joystick coordinates (0-4095 scale).

---

## 3. Key Technical Features

### Communication Protocol
| Data Type | Source | Dest | Transport | Format |
| :--- | :--- | :--- | :--- | :--- |
| **Video** | Rover | Host | UDP (WiFi) | Raw JPEG Chunks |
| **Control** | Host | Gateway | USB Serial | JSON/Char |
| **Control** | Gateway | Rover | ESP-NOW | Packed Struct `{int x, int y}` |
| **Telemetry**| Rover | Gateway | ESP-NOW | Packed Struct `{float v, int d}` |
| **Telemetry**| Gateway | Host | USB Serial | String `Pin: 12.0V | Dist: 150` |

### Safety Logic (Firmware Level)
The `RescueRobot.ino` implements a strict priority hierarchy:
1.  **Signal Failsafe:** If `lastPacketTime > 500ms`, force Stop.
2.  **Obstacle Reflex:** If `currentDistance < 25cm` AND `Command == FORWARD`, override to Stop.
3.  **Operator Command:** If safe, execute `MotorDriver` logic.

### Video Transport (UDP Implementation)
* The `CameraModule.cpp` pushes raw frame buffers to a specific target IP.
* The `camera_reassembler.py` (Python) listens on `0.0.0.0:9999`.
* **Optimization:** Configured for low JPEG quality (30) and QVGA resolution to keep packet size below MTU fragmentation limits where possible, ensuring high frame rates for AI processing.

---

## 4. Hardware Requirements
* **Rover:** ESP32-S3 (PSRAM required for Video), OV2640 Camera, L298N Motor Driver, HC-SR04 Ultrasonic.
* **Gateway:** Standard ESP32/ESP8266 (No PSRAM needed).
* **Host:** PC/Mac capable of running Python 3.10+ and OpenCV.

## 5. Deployment Notes
* **Network:** WiFi Credentials (`WIFI_SSID`) are hardcoded in `RescueRobot.ino` and `GatewayModule.cpp` and must match.
* **Pairing:** The Gateway MAC address is hardcoded in `ConnectionModule.cpp` on the Rover, and the Rover MAC is hardcoded in `GatewayModule.cpp` on the Gateway. These must be updated for new hardware.