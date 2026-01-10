# NiceGUI Rescue Rover Dashboard — Full Project

**Purpose:** A ready-to-run NiceGUI dashboard project tailored for the Rescue Rover design. Includes live MJPEG video ingestion from your Python gateway, mission log/telemetry panel, LLM bridge stub, evidence fetch button, and integration notes for ESP-NOW reassembler.

---

## Project structure

```
rescue-rover-dashboard/
├─ app.py                  # Main NiceGUI application
├─ requirements.txt        # Python deps
├─ camera_reassembler.py   # Reassembles incoming chunks into JPEG frames (placeholder)
├─ llm_worker.py           # LLM bridge thread (Ollama/Gemini stub)
├─ evidence_api.py         # Endpoint to request evidence fetch / manifest
├─ frontend/               # Frontend UI
│  └─ assets
|  └─ index.html
├─ README.md               # This guide
└─ systemd/                # systemd service example
   └─ rescue-rover.service
```

---

## Quickstart (local)

1. Create a Python 3.10+ virtualenv and activate it:

```bash
python -m venv .venv
source .venv/bin/activate
```

2. Install requirements:

```bash
pip install -r requirements.txt
```

3. Start the app:

```bash
python app.py
```

4. Open `http://localhost:8080` in your browser.

---

## `requirements.txt`

```
nicegui
opencv-python-headless
requests
# Add your LLM client libs below, e.g. ollama/gemini clients
# ollama (example) - pip install ollama
```

*(Pin versions as appropriate. nicegui version used here is an example.)*

---


## `app.py` (Main NiceGUI app)

---
## `camera_reassembler.py` (placeholder / example)

**Integration note:** The Courier (Python gateway) should reconstruct JPEG frames from the rover's fragment packets and call `FrameBuffer.feed_frame(jpeg_bytes, telemetry=...)` to push frames to the UI.

---
## `llm_worker.py` (LLM bridge stub — runs in background)

---
## `evidence_api.py` (manifest + fetch endpoint / function)

**Integration:** Replace `request_manifest()` with code to send a `CMD_MANIFEST` packet to rover via your Courier (e.g. `pyserial` or UDP to the gateway), then the gateway should reassemble the listed files and store them where the UI can download them.

---

## `systemd/rescue-rover.service` example

```
[Unit]
Description=Rescue Rover NiceGUI Dashboard
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/opt/rescue-rover-dashboard
Environment=PYTHONUNBUFFERED=1
ExecStart=/opt/rescue-rover-dashboard/.venv/bin/python app.py
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## Deployment notes & integration tips

### 1) Video transport model

* Your Courier (Member 2) already reassembles ESP-NOW fragments into JPG chunks. The fastest integration is: the courier writes each complete JPEG to stdin socket or local TCP/UNIX socket. The `camera_reassembler.FrameBuffer.feed_frame()` should be called by the courier when a new JPEG is complete.
* Alternative: Gateway serves MJPEG via HTTP; NiceGUI can embed an `<img src="http://gateway/mjpeg">` or fetch frames and use `video.set_source`.

### 2) LLM integration

* **Batching & rate limits:** original design sampled at 0.5 Hz — keep or increase to 0.5–1.0 Hz to avoid rate limits and cost.
* **JSON contract:** Have the LLM return a strict JSON structure with fields: `command`, `confidence`, `bbox` (optional), `notes`.

### 3) Security

* If deploying outside local network, enable TLS (reverse proxy like nginx) and authentication.
* Consider token-based API for evidence fetch and a simple password for the dashboard.

### 4) Telemetry & logs

* For persistent mission logs, write to disk (append-only) in addition to the UI list.
* Consider a rotating log file or SQLite for post-mission analysis.

### 5) Joystick / teleop

* NiceGUI has a raw JS input capability; you can implement a simple keyboard or joystick control that issues JSON commands to the gateway.
* For low-latency teleop, use WebSocket channel from NiceGUI to the courier.

---