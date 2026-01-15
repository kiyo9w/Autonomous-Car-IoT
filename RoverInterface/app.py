# app.py

from nicegui import ui, app
import threading
import asyncio
import serial
import queue
import time
import glob

from camera_reassembler import FrameBuffer
from llm_worker import AIWorker
import evidence_api
from fastapi.staticfiles import StaticFiles

# AI imports
from ai.command_arbiter import CommandArbiter, RoverCommand, CommandPriority

# ------------------------
# Serial Bridge (Fixes "Air Gap")
# Kết nối Mac <-> ESP32 Gateway qua USB Serial
# ------------------------

class RoverSerial:
    """
    Serial bridge to ESP32 Gateway.
    Sends joystick commands and receives telemetry feedback.
    """
    def __init__(self, port: str = None, baud: int = 115200):
        self.ser = None
        self.write_queue = queue.Queue()
        self.running = True
        self.last_feedback = {'voltage': 0.0, 'distance': 0}
        
        # Auto-detect port if not specified
        if port is None:
            port = self._auto_detect_port()
        
        if port:
            try:
                self.ser = serial.Serial(port, baud, timeout=0.1)
                print(f"✅ Connected to Gateway at {port}")
            except Exception as e:
                print(f"❌ Serial Error: {e}")
                self.ser = None
        else:
            print("⚠️ No ESP32 Gateway detected. Running in demo mode.")
        
        # Start background threads
        threading.Thread(target=self._write_loop, daemon=True).start()
        threading.Thread(target=self._read_loop, daemon=True).start()
    
    def _auto_detect_port(self) -> str:
        """Auto-detect ESP32 CH340 serial port on Mac/Linux"""
        patterns = [
            '/dev/cu.usbserial-*',      # CH340
            '/dev/cu.wchusbserial*',    # CH340 alternative
            '/dev/cu.SLAB_USBtoUART*',  # CP2102
            '/dev/ttyUSB*',             # Linux
        ]
        for pattern in patterns:
            ports = glob.glob(pattern)
            if ports:
                return ports[0]
        return None
    
    def _write_loop(self):
        """Background thread to send commands without blocking UI"""
        while self.running:
            try:
                if not self.write_queue.empty():
                    cmd_data = self.write_queue.get_nowait()
                    if self.ser and self.ser.is_open:
                        # Format: Single character command (F/B/L/R/S)
                        # or "X,Y\n" for analog joystick
                        if 'char' in cmd_data:
                            self.ser.write(cmd_data['char'].encode('utf-8'))
                        else:
                            msg = f"{cmd_data['x']},{cmd_data['y']}\n"
                            self.ser.write(msg.encode('utf-8'))
            except Exception as e:
                pass  # Ignore transient errors
            time.sleep(0.01)
    
    def _read_loop(self):
        """Background thread to read telemetry from Gateway"""
        while self.running:
            try:
                if self.ser and self.ser.is_open and self.ser.in_waiting > 0:
                    line = self.ser.readline().decode('utf-8', errors='ignore').strip()
                    # Parse feedback: "Pin: 12.5V | Dist: 150"
                    if 'Pin:' in line and 'Dist:' in line:
                        parts = line.split('|')
                        voltage_part = parts[0].replace('Pin:', '').replace('V', '').strip()
                        dist_part = parts[1].replace('Dist:', '').strip()
                        self.last_feedback = {
                            'voltage': float(voltage_part),
                            'distance': int(dist_part)
                        }
            except Exception as e:
                pass
            time.sleep(0.05)
    
    def send_joystick(self, x: float, y: float):
        """
        Send joystick input to rover.
        x, y in range [-1.0, 1.0], center = 0
        Converts to 0..4095 range (center = 2048)
        """
        map_x = int((x + 1) * 2047.5)
        map_y = int((y + 1) * 2047.5)
        self.write_queue.put({'x': map_x, 'y': map_y})
    
    def send_command(self, cmd: str):
        """
        Send single character command.
        F=Forward, B=Backward, L=Left, R=Right, S=Stop
        """
        if cmd in ['F', 'B', 'L', 'R', 'S']:
            self.write_queue.put({'char': cmd})
    
    def get_feedback(self) -> dict:
        """Get latest telemetry from rover"""
        return self.last_feedback
    
    def close(self):
        """Cleanup serial connection"""
        self.running = False
        if self.ser and self.ser.is_open:
            self.ser.close()

# ------------------------
# Configuration
# ------------------------

# Video input modes: 'udp', 'http', 'webcam'
VIDEO_MODE = 'webcam'  # Change based on your setup
UDP_PORT = 9999
HTTP_URL = 'http://192.168.1.10/stream'  # Rover's HTTP stream URL
WEBCAM_INDEX = 1

# ------------------------
# Backend state
# ------------------------

# Initialize frame buffer based on mode
if VIDEO_MODE == 'udp':
    frame_buffer = FrameBuffer(mode='udp', port=UDP_PORT)
elif VIDEO_MODE == 'http':
    frame_buffer = FrameBuffer(mode='http', http_url=HTTP_URL)
else:
    frame_buffer = FrameBuffer(mode='webcam', camera_index=WEBCAM_INDEX)

mission_log = []
rover_serial = RoverSerial()  # Initialize serial bridge

# ------------------------
# AI Integration
# ------------------------

def on_ai_command(cmd: RoverCommand):
    """Callback when AI issues a command"""
    rover_serial.write_queue.put({'x': cmd.x, 'y': cmd.y})

command_arbiter = CommandArbiter(command_callback=on_ai_command)
ai_worker = AIWorker(frame_buffer, mission_log, command_arbiter)

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
from fastapi.responses import StreamingResponse
import io

@app.get('/api/telemetry')
def get_telemetry():
    # Merge camera telemetry with serial feedback
    telemetry = frame_buffer.get_telemetry()
    serial_data = rover_serial.get_feedback()
    
    # MAP KEYS for Legacy Frontend
    # Legacy expects 'battery' (voltage) and 'state'
    if 'voltage' in telemetry:
        telemetry['battery'] = telemetry['voltage']
    
    # Add AI Hazard status
    telemetry['hazard'] = ai_worker.last_tactical.hazard if hasattr(ai_worker, 'last_tactical') and ai_worker.last_tactical else False
    
    return {**telemetry, **serial_data}

@app.get('/api/mission_log')
def get_mission_log():
    return mission_log[-100:]

@app.post('/api/evidence')
async def fetch_evidence():
    await evidence_api.request_manifest()
    return {'ok': True}

# --- Video Streaming for Legacy UI ---
def gen_frames():
    while True:
        frame = frame_buffer.get_frame()
        if frame:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        else:
            time.sleep(0.1)

@app.get('/video_feed')
def video_feed():
    return StreamingResponse(gen_frames(), media_type='multipart/x-mixed-replace; boundary=frame')

@app.get('/stream')  # Alternate common endpoint
def stream():
    return StreamingResponse(gen_frames(), media_type='multipart/x-mixed-replace; boundary=frame')


@app.post('/api/control')
def send_control(cmd: str = 'S'):
    """
    Send movement command to rover.
    cmd: F=Forward, B=Backward, L=Left, R=Right, S=Stop
    """
    rover_serial.send_command(cmd.upper())
    mission_log.append(f"📍 {time.strftime('%H:%M:%S')} Command: {cmd}")
    return {'ok': True, 'sent': cmd}

@app.post('/api/joystick')
def send_joystick(x: float = 0.0, y: float = 0.0):
    """
    Send analog joystick input to rover.
    x, y in range [-1.0, 1.0]
    """
    rover_serial.send_joystick(x, y)
    return {'ok': True, 'x': x, 'y': y}

@app.get('/api/frame')
def get_frame():
    """
    Get single JPEG frame from camera.
    Returns base64-encoded image or null if no frame available.
    """
    import base64
    frame = frame_buffer.get_frame()
    if frame:
        return {
            'ok': True,
            'frame': base64.b64encode(frame).decode('utf-8'),
            'size': len(frame)
        }
    return {'ok': False, 'frame': None}

from fastapi.responses import StreamingResponse

@app.get('/api/video')
def video_stream():
    """
    MJPEG video stream endpoint.
    Use: <img src="/api/video"> in HTML
    """
    def generate():
        while True:
            frame = frame_buffer.get_frame()
            if frame:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            time.sleep(0.033)  # ~30 FPS max
    
    return StreamingResponse(
        generate(),
        media_type='multipart/x-mixed-replace; boundary=frame'
    )

# ------------------------
# AI API endpoints
# ------------------------

@app.get('/api/ai/status')
def get_ai_status():
    """Get AI system status"""
    return {
        'ai': ai_worker.get_status(),
        'arbiter': command_arbiter.get_status()
    }

@app.post('/api/ai/enable')
def enable_ai():
    """Enable AI autonomous control"""
    ai_worker.enable()
    command_arbiter.enable()
    return {'ok': True, 'enabled': True}

@app.post('/api/ai/disable')
def disable_ai():
    """Disable AI autonomous control"""
    ai_worker.disable()
    command_arbiter.disable()
    return {'ok': True, 'enabled': False}

@app.post('/api/ai/toggle')
def toggle_ai():
    """Toggle AI on/off"""
    if ai_worker.is_enabled():
        ai_worker.disable()
        command_arbiter.disable()
        return {'ok': True, 'enabled': False}
    else:
        ai_worker.enable()
        command_arbiter.enable()
        return {'ok': True, 'enabled': True}

# ------------------------
# Background workers
# ------------------------

def start_workers():
    """Start background AI workers"""
    ai_worker.start()

start_workers()

# ------------------------
# Run server
# ------------------------

if __name__ in {"__main__", "__mp_main__"}:
    ui.run(port=8080)

