#app.py

from nicegui import ui, app
import threading
import sys

from camera_reassembler import FrameBuffer
from serial_manager import SerialManager
import llm_worker
import evidence_api
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from fastapi.responses import StreamingResponse
import time

# ------------------------
# Backend state
# ------------------------

# Initialize FrameBuffer (Video)
# Initialize FrameBuffer (Video)
frame_buffer = FrameBuffer(mode='udp', port=9999) # 🚀 UDP Input from Rover

# Initialize SerialManager (Control)
# Auto-detects port, but prefers /dev/cu.usbserial-0001 if available
serial_manager = SerialManager(port='/dev/cu.usbserial-0001') 

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

@app.get('/video_feed')
def video_feed():
    def gen_frames():
        while True:
            frame = frame_buffer.get_frame()
            if frame:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            time.sleep(0.033) # ~30 FPS

    return StreamingResponse(gen_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get('/api/telemetry')
def get_telemetry():
    # Merge Video Telemetry (FPS, Connection) + Serial Telemetry (Voltage, Distance)
    video_stats = frame_buffer.get_telemetry()
    rover_stats = serial_manager.get_telemetry()
    
    return {
        **video_stats,
        **rover_stats,
        'mode': 'remote' # active mode
    }

@app.post('/api/command')
async def send_command(request: Request):
    data = await request.json()
    cmd = data.get('command')
    
    if cmd:
        success = serial_manager.send_command(cmd)
        
        # Log command
        log_entry = {
            'command': cmd,
            'status': 'sent' if success else 'failed',
            'timestamp': str(threading.get_ident()) # placeholder time
        }
        mission_log.append(log_entry)
        
        return {'ok': success}
    return {'ok': False, 'error': 'No command provided'}

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
    # 1. Start Serial Connection
    serial_manager.start()

    # 2. Start LLM Worker
    threading.Thread(
        target=llm_worker.loop,
        args=(frame_buffer, mission_log, serial_manager), # Pass serial_manager for AI control
        daemon=True
    ).start()

start_workers()

# ------------------------
# Run server
# ------------------------

if __name__ in {"__main__", "__mp_main__"}:
    # Update nicegui port if needed to avoid conflicts
    ui.run(port=8080)
