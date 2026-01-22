#app.py

from nicegui import ui, app
import threading
import sys
import time

from camera_reassembler import FrameBuffer
from serial_manager import SerialManager
import llm_worker
import evidence_api
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from fastapi.responses import StreamingResponse

# ------------------------
# Backend state
# ------------------------

# Initialize FrameBuffer (Video)
# Argument parsing for Rover IP
import argparse
parser = argparse.ArgumentParser()
parser.add_argument('--ip', default='172.20.10.2', help='Rover IP address')
args, _ = parser.parse_known_args()

# Initialize FrameBuffer (Video)
# Using HTTP mode to support multi-client proxying via this backend
stream_url = f"http://{args.ip}/stream"
print(f"🚀 CONNECTING TO ROVER CAMERA AT: {stream_url}")
frame_buffer = FrameBuffer(mode='http', http_url=stream_url)

# Initialize SerialManager (Control)
serial_manager = SerialManager(port='/dev/cu.usbserial-0001') 

mission_log = []

# ------------------------
# CORS (Vite dev server)
# ------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
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
        'mode': 'remote'
    }

@app.post('/api/command')
async def send_command(request: Request):
    data = await request.json()
    cmd = data.get('command')
    print(f"🎮 /api/command received: {cmd}", flush=True)  # DEBUG
    
    if cmd:
        success = serial_manager.send_command(cmd)
        print(f"🎮 Command result: {'✅' if success else '❌'}", flush=True)  # DEBUG
        
        log_entry = {
            'command': cmd,
            'status': 'sent' if success else 'failed',
            'timestamp': str(threading.get_ident())
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

@app.get('/api/ai_status')
def get_ai_status():
    print("🔍 /api/ai_status called")
    if 'ai_worker' in globals():
        status = ai_worker.get_status()
        print(f"📡 Returning: enabled={status.get('enabled')}, reasoning_len={len(status.get('last_reasoning', ''))}")
        return status
    print("⚠️ ai_worker not in globals")
    return {'enabled': False, 'running': False, 'message': 'AI Worker not initialized'}

# ------------------------
# Background workers
# ------------------------

def start_workers():
    # 1. Start Serial Connection
    serial_manager.start()

    # 2. Start AI Worker (Tactical + Strategic)
    from ai.command_arbiter import CommandArbiter
    
    # Initialize Arbiter
    arbiter = CommandArbiter(serial_manager.send_command)
    
    # Initialize and Start AI Worker
    global ai_worker
    ai_worker = llm_worker.AIWorker(frame_buffer, mission_log, arbiter)
    ai_worker.start()
    
    print("✅ AI Pipeline Initialized (Tactical + Strategic)")

start_workers()

# ------------------------
# Run server
# ------------------------

if __name__ in {"__main__", "__mp_main__"}:
    # CRITICAL: reload=False prevents dual-process issue
    ui.run(port=8080, reload=False)
