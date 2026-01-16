# app.py

from nicegui import ui, app
import threading
import asyncio

from camera_reassembler import FrameBuffer
import llm_worker
import evidence_api
from fastapi.staticfiles import StaticFiles

# ------------------------
# Backend state
# ------------------------

frame_buffer = FrameBuffer()
mission_log = []

# ------------------------
# Serve Figma UI
# ------------------------

app.add_static_files('/ui', 'frontend')
app.add_static_files('/assets', 'frontend/assets')

@ui.page('/')
def root():
    ui.html('''
        <iframe
            src="/ui/index.html"
            style="width:100vw;height:100vh;border:none;"
        ></iframe>
    ''',
    sanitize=False)

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
