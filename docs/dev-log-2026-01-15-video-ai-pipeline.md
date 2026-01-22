# Dev Log: Multi-Client Video Stream & AI Visualization Pipeline

**Date:** 2026-01-15  
**Session ID:** cded904e-6f5b-4a41-be41-20e710d1e8f0

---

## Summary

Successfully implemented a multi-client video streaming solution with integrated AI visualization for the Rescue Rover project. The ESP32-S3 streams video via HTTP to a Python backend proxy (`app.py`), which then re-broadcasts to multiple frontend clients. YOLO bounding boxes and VLM reasoning are now displayed in real-time on the dashboard.

---

## Problems Solved

### 1. Single-Client ESP32 Limitation
- **Problem:** ESP32's HTTP streaming only supports one client connection at a time.
- **Solution:** `app.py` acts as an HTTP proxy. It connects to the ESP32's `/stream` endpoint and re-broadcasts frames to multiple frontend clients via `/video_feed`.
- **Files Modified:**
  - `RoverInterface/app.py` - Changed `FrameBuffer` to `mode='http'` with ESP32 URL
  - `RoverInterface/camera_reassembler.py` - Added HTTP receiver thread

### 2. AI Pipeline Not Active
- **Problem:** `app.py` was calling a legacy `llm_worker.loop()` stub instead of the actual `AIWorker` class.
- **Solution:** Correctly instantiate and start `llm_worker.AIWorker` with `FrameBuffer`, `mission_log`, and `CommandArbiter`.
- **Files Modified:**
  - `RoverInterface/app.py` - Updated `start_workers()` to use `AIWorker`

### 3. AI Visualization Not Displayed
- **Problem:** YOLO detections and VLM reasoning were computed but never shown on the video stream or UI.
- **Solution:**
  - Split `FrameBuffer` into `_raw_frame` (for AI input) and `_display_frame` (for frontend output)
  - `AIWorker._tactical_loop` now draws bounding boxes (Red=Person, Green=Object) onto the display frame
  - Added `/api/ai_status` endpoint to expose VLM reasoning
  - Connected `AIAnalysisPanel.tsx` to poll this endpoint
- **Files Modified:**
  - `RoverInterface/camera_reassembler.py` - Added `get_raw_frame()`, `set_display_frame()`, `set_active_ai()`
  - `RoverInterface/llm_worker.py` - Updated `_tactical_loop` to draw boxes, store `last_reasoning` in stats
  - `RoverInterface/app.py` - Added `/api/ai_status` endpoint
  - `frontend/src/components/AIAnalysisPanel.tsx` - Poll API and display reasoning

### 4. NiceGUI Dual-Process Bug
- **Problem:** NiceGUI's `reload=True` (default) spawns two processes. One ran the VLM, another served the API. The API process had empty `stats`, causing `reasoning_len=0`.
- **Solution:** Set `ui.run(port=8080, reload=False)` to run a single process.
- **Files Modified:**
  - `RoverInterface/app.py` - Added `reload=False`

### 5. Connection Conflict
- **Problem:** Having the ESP32 stream open in a browser tab consumed the only HTTP connection, blocking the backend.
- **Solution:** User must close direct browser connections to ESP32 before running the backend.

### 6. CORS Issues
- **Problem:** Frontend couldn't reach API due to restricted CORS origins.
- **Solution:** Changed `allow_origins=["http://localhost:3000"]` to `allow_origins=["*"]` for development.
- **Files Modified:**
  - `RoverInterface/app.py` - Updated CORS middleware

---

## Key Architecture

```
ESP32-S3 (172.20.10.2/stream)
        │
        ▼ (Single HTTP Connection)
┌───────────────────────────────────────┐
│             app.py (Port 8080)        │
│  ┌─────────────────────────────────┐  │
│  │       FrameBuffer               │  │
│  │  _raw_frame → AI Processing     │  │
│  │  _display_frame → Frontend      │  │
│  └─────────────────────────────────┘  │
│              │                        │
│  ┌───────────┼────────────────────┐   │
│  │      AIWorker                  │   │
│  │  Tactical (YOLO) → Boxes       │   │
│  │  Strategic (VLM) → Reasoning   │   │
│  └────────────────────────────────┘   │
│              │                        │
│  /video_feed → MJPEG with annotations │
│  /api/ai_status → VLM reasoning JSON  │
└───────────────────────────────────────┘
        │
        ▼ (Multiple Clients)
┌───────────────────────────────────────┐
│        Frontend (Port 3000)           │
│  CameraFeed.tsx → displays stream     │
│  AIAnalysisPanel.tsx → shows reasoning│
└───────────────────────────────────────┘
```

---

## Configuration Notes

1. **ESP32 IP:** Configurable via `--ip` argument (default: `172.20.10.2`)
2. **VLM Colab URL:** Must be updated in `config.py` when ngrok URL changes
3. **Serial Port:** Auto-connects to `/dev/cu.usbserial-0001`

---

## Common Issues & Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| `reasoning_len=0` | NiceGUI dual-process | Set `reload=False` |
| `OpenCV: Couldn't read video stream` | Browser tab using ESP32 connection | Close direct ESP32 tabs |
| UI shows placeholders | CORS blocked API calls | Set `allow_origins=["*"]` |
| Video flickering | Raw frame overwriting annotated | Use `_ai_active` flag |

---

## Files Modified (Summary)

| File | Changes |
|------|---------|
| `app.py` | HTTP proxy, AIWorker init, `/api/ai_status`, CORS, `reload=False` |
| `camera_reassembler.py` | Dual-buffer system, HTTP receiver, `set_active_ai()` |
| `llm_worker.py` | Bounding box drawing, `last_reasoning` storage |
| `AIAnalysisPanel.tsx` | API polling, dynamic hostname, real-time updates |
| `CameraFeed.tsx` | Dynamic stream URL |

---

## Testing Checklist

- [ ] Close all direct browser connections to ESP32
- [ ] Start backend: `python3 RoverInterface/app.py`
- [ ] Start frontend: `cd RoverInterface/frontend && npm run dev`
- [ ] Open `http://localhost:8080`
- [ ] Verify video stream shows
- [ ] Verify bounding boxes on detected objects
- [ ] Verify AI reasoning updates in panel
