# Rescue Rover — IoT + AI “Split‑Brain” Autonomous Rescue Rover
Low-cost ESP32‑S3 rover for hazardous-environment scouting with real-time video, ultra‑low‑latency control, and hybrid local+cloud AI navigation.

> **Status**: Research/academic prototype (HUST, Jan 2026).

---

## Table of Contents
- [Key features](#key-features)
- [Demos (videos)](#demos-videos)
- [System architecture](#system-architecture)
- [Quick start](#quick-start)
- [Hardware & protocols (ESP-NOW / ESP32-S3)](#hardware--protocols-esp-now--esp32-s3)

---

## Key features
- **Real-time operator view**: live video streaming (MJPEG over HTTP; UDP mode used for lower latency in experiments).
- **Low-latency control**: ESP‑NOW command + telemetry link designed for fast response.
- **Hybrid AI stack (“Split‑Brain”)**:
  - Reactive safety on the rover firmware (ultrasonic obstacle E‑STOP and watchdog/heartbeat failsafe).
  - Tactical local perception on the host (YOLOv8‑Nano on Apple Silicon/CoreML for fast detections).
  - Strategic scene reasoning in the cloud (Qwen2.5‑VL‑7B served via vLLM + FastAPI, exposed through ngrok).
- **Operator dashboard**: NiceGUI-based UI for video, telemetry, and mission logging.
- **Command arbitration**: resolves conflicts between safety overrides, tactical AI, strategic AI, and manual joystick input via a priority ladder.

---

## Demos (videos)
> Add your two demo links here (YouTube, Drive, etc.). Keep filenames stable so README links don’t break.

### 1) Autonomous driving from LLM instructions
- **Video**: `docs/videos/autonomous_llm_drive.mp4` (or link)
- What to show: the cloud “Strategic Layer” generating steering suggestions while local safety/tactical layers still gate execution.

### 2) Fail mode: “headspin” (camera aiming at the ground)
- **Video**: `docs/videos/failmode_headspin.mp4` (or link)
- What to show: the comical failure case where the rover “head” points down and spins ~15 seconds (include raw telemetry overlay if available).

---

## System architecture

### Split‑Brain overview
The system is intentionally distributed across four processing nodes: Rover (ESP32‑S3), Gateway (ESP32 bridge), Host computer (dashboard + tactical AI), and Cloud GPU (strategic VLM).

### Diagram gallery (extract 4–5 from the report)
Place extracted images under `docs/assets/diagrams/` and keep names stable.

1) **End-to-end system architecture (Rover ↔ Gateway ↔ Host ↔ Cloud)**  
![High-level system architecture](docs/assets/diagrams/fig_2_1_system_architecture.png)  
Source suggestion: Figure 2.1 “High level system architecture… four processing nodes and their data links.”

2) **Hybrid intelligence layers (Reactive / Tactical / Strategic)**  
![Hybrid intelligence model](docs/assets/diagrams/fig_2_2_hybrid_intelligence.png)  
Source suggestion: Figure 2.2 “Three-layer hybrid intelligence model distributed across Edge and Cloud.”

3) **Cloud “Brain” infrastructure (Strategic layer)**  
![Cloud infrastructure layout](docs/assets/diagrams/fig_5_2_cloud_infra.png)  
Source suggestion: Figure 5.2 “Cloud infrastructure layout for the Strategic Layer.”

4) **ESP‑NOW + safety-critical deferred actuation dataflow**  
![Deferred motor actuation dataflow](docs/assets/diagrams/fig_4_13_deferred_actuation.png)  
Source suggestion: Figure 4.13 “Deferred motor actuation design.”

5) **Motion trace / “drift visualizer” (trajectory plot)**
![Motion trace visualization](docs/assets/diagrams/fig_6_8_motion_trace.png)  
Source suggestion: Figure 6.8 “Path traced during a point turn…” (use this as the motion/drift visualization anchor).

> Optional hardware-focused extras (if you want more visuals): power distribution schematic (Fig 3.14) and complete wiring diagram (Fig 3.19).

---

## Quick start

### 0) Prereqs
- Rover firmware: Arduino framework for ESP32‑S3.
- Host app: Python (NiceGUI dashboard + gateway/courier logic).
- Optional cloud brain: Google Colab GPU + FastAPI + vLLM + ngrok endpoint.

### 1) Flash the rover (ESP32‑S3)
- Configure ESP32‑S3 with PSRAM enabled (the firmware design assumes camera buffers dominate PSRAM usage).
- Upload the rover firmware and verify:
  - Camera initializes and streams.
  - Motors respond to commands.
  - Ultrasonic sensor updates distance and blocks forward motion at the configured threshold.

### 2) Run the host dashboard
- Start the Python dashboard (NiceGUI) to get:
  - Live video display,
  - Telemetry (battery voltage + distance),
  - Manual control,
  - Local YOLO tactical detections.

### 3) (Optional) Enable cloud strategic navigation
- Bring up the cloud server (Colab) and expose it via ngrok HTTPS.
- The host should sample frames at low frequency for strategic analysis (designed to avoid blocking real-time control when the network is slow).

---

## Hardware & protocols (ESP-NOW / ESP32-S3)

### ESP32‑S3 (rover controller)
- The rover uses an ESP32‑S3 + OV2640 camera for video capture, plus motor control and sensors.
- PSRAM is a practical requirement due to camera buffering.

### ESP‑NOW link (control + telemetry)
ESP‑NOW is used for low-latency command delivery and bidirectional telemetry between rover and gateway.

- **Command packet**: joystick `x/y` in `[0..4095]` with center at `2048`.
- **Telemetry packet**: `voltage` (battery) and `distance` (ultrasonic).
- **Safety-first firmware design**: ESP‑NOW receive callback stores the command; actuation happens in the main loop after safety checks (“deferred motor actuation”).

### Safety mechanisms (don’t skip)
- Heartbeat failsafe: link loss triggers a safe stop.
- Obstacle blocking: forward motion is blocked when the ultrasonic sensor detects close obstacles (directional safety so backing out remains possible).
