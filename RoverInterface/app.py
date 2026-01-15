#app.py

from nicegui import ui, app
import threading

from camera_reassembler import FrameBuffer
import llm_worker
import evidence_api
from fastapi.middleware.cors import CORSMiddleware

# ------------------------
# Backend state
# ------------------------

frame_buffer = FrameBuffer()
mission_log = []

# ------------------------
# CORS (Vite dev server)
# ------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------
# Frontend bridge (iframe)
# ------------------------

@ui.page('/')
def root():
    ui.html('''
        <iframe
            src="http://localhost:3000"
            style="width:100vw;height:100vh;border:none;display:block;"
            allow="autoplay; camera; microphone"
        ></iframe>
    ''', sanitize=False)

# ------------------------
# API endpoints
# ------------------------

@app.get('/api/telemetry')
def get_telemetry():
    return frame_buffer.get_telemetry()

@app.get('/api/mission_log')
def get_mission_log():
    return mission_log[-100:]

@app.post('/api/evidence')
async def fetch_evidence():
    await evidence_api.request_manifest()
    return {'ok': True}

# ------------------------
# Background workers
# ------------------------

def start_workers():
    threading.Thread(
        target=llm_worker.loop,
        args=(frame_buffer, mission_log, None),
        daemon=True
    ).start()

start_workers()

# ------------------------
# Run server
# ------------------------

if __name__ in {"__main__", "__mp_main__"}:
    ui.run(port=8080)
