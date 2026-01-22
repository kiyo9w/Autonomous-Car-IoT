# camera_reassembler.py
"""
Camera Frame Buffer for Rescue Rover

Supports multiple input modes:
1. UDP Stream - Low latency, receives from ESP32-S3 rover
2. HTTP Stream - Fallback, connects to rover's /stream endpoint
3. Local Webcam - For development/testing

The FrameBuffer provides thread-safe access to the latest frame
and telemetry data for use by the UI and AI workers.
"""

import time
import threading
import socket
import cv2
import numpy as np
from typing import Optional


class FrameBuffer:
    """
    Thread-safe buffer for camera frames and telemetry.
    Supports UDP, HTTP, and local webcam input.
    """
    
    def __init__(self, mode: str = 'udp', port: int = 9999, 
                 http_url: str = None, camera_index: int = 0):
        """
        Initialize FrameBuffer.
        
        Args:
            mode: 'udp', 'http', or 'webcam'
            port: UDP port to listen on (for UDP mode)
            http_url: URL of MJPEG stream (for HTTP mode)
            camera_index: Camera device index (for webcam mode)
        """
        self._raw_frame: Optional[bytes] = None
        self._display_frame: Optional[bytes] = None
        self._telemetry: dict = {
            'voltage': 0.0,
            'distance': 999,
            'state': 'DISCONNECTED',
            'fps': 0.0
        }
        self._running = True
        self._lock = threading.Lock()
        
        # Mode configuration
        self._mode = mode
        self._port = port
        self._http_url = http_url
        self._camera_index = camera_index
        
        # FPS tracking
        self._frame_count = 0
        self._last_fps_time = time.time()
        
        # Start receiver thread based on mode
        if mode == 'udp':
            self._start_udp_receiver()
        elif mode == 'http':
            self._start_http_receiver()
        elif mode == 'webcam':
            self._start_webcam_receiver()
        else:
            print(f"⚠️ Unknown mode: {mode}. Running without video input.")
    
    def _start_udp_receiver(self):
        """Start UDP receiver thread."""
        def udp_loop():
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind(('0.0.0.0', self._port))
            sock.settimeout(1.0)  # Allow checking _running flag
            
            print(f"📡 UDP Receiver listening on port {self._port}")
            
            while self._running:
                try:
                    # Receive large packets (up to 64KB)
                    data, addr = sock.recvfrom(65535)
                    
                    if len(data) > 100:  # Minimum JPEG size
                        # Decode JPEG
                        np_arr = np.frombuffer(data, dtype=np.uint8)
                        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                        
                        if img is not None:
                            # Re-encode to ensure valid JPEG
                            _, jpeg = cv2.imencode('.jpg', img)
                            self.feed_frame(jpeg.tobytes())
                            self._update_telemetry_state('CONNECTED')
                        
                except socket.timeout:
                    self._update_telemetry_state('WAITING')
                except Exception as e:
                    print(f"UDP Error: {e}")
            
            sock.close()
        
        threading.Thread(target=udp_loop, daemon=True, name="UDPReceiver").start()
    
    def _start_http_receiver(self):
        """Start HTTP MJPEG receiver thread."""
        def http_loop():
            print(f"🌐 HTTP Receiver connecting to {self._http_url}")
            
            while self._running:
                try:
                    cap = cv2.VideoCapture(self._http_url)
                    if not cap.isOpened():
                        print("❌ Failed to open HTTP stream, retrying...")
                        time.sleep(2)
                        continue
                    
                    self._update_telemetry_state('CONNECTED')
                    
                    while self._running:
                        ret, frame = cap.read()
                        if not ret:
                            print("⚠️ Stream interrupted, reconnecting...")
                            break
                        
                        _, jpeg = cv2.imencode('.jpg', frame)
                        self.feed_frame(jpeg.tobytes())
                    
                    cap.release()
                    
                except Exception as e:
                    print(f"HTTP Error: {e}")
                    time.sleep(2)
        
        if self._http_url:
            threading.Thread(target=http_loop, daemon=True, name="HTTPReceiver").start()
        else:
            print("⚠️ HTTP mode requires http_url parameter")
    
    def _start_webcam_receiver(self):
        """Start local webcam receiver thread."""
        def webcam_loop():
            print(f"📷 Webcam Receiver using camera {self._camera_index}")
            cap = cv2.VideoCapture(self._camera_index)
            
            if not cap.isOpened():
                print(f"❌ Failed to open webcam {self._camera_index}")
                return
            
            self._update_telemetry_state('CONNECTED')
            
            while self._running:
                ret, frame = cap.read()
                if not ret:
                    time.sleep(0.1)
                    continue
                
                _, jpeg = cv2.imencode('.jpg', frame)
                self.feed_frame(jpeg.tobytes(), telemetry={
                    'distance': 100,  # Simulated
                    'voltage': 12.0   # Simulated
                })
                
                time.sleep(0.033)  # ~30 FPS
            
            cap.release()
        
        threading.Thread(target=webcam_loop, daemon=True, name="WebcamReceiver").start()
    
    def _update_telemetry_state(self, state: str):
        """Update connection state in telemetry."""
        with self._lock:
            self._telemetry['state'] = state
    
    def _update_fps(self):
        """Calculate and update FPS."""
        self._frame_count += 1
        now = time.time()
        elapsed = now - self._last_fps_time
        
        if elapsed >= 1.0:
            fps = self._frame_count / elapsed
            with self._lock:
                self._telemetry['fps'] = round(fps, 1)
            self._frame_count = 0
            self._last_fps_time = now
    
    def set_active_ai(self, active: bool):
        """Set whether AI is actively writing to the display frame."""
        # Using a separate atomic flag might be safer, but lock is strictly used elsewhere.
        # We don't need the lock for a boolean assignment in Python (atomic), but good practice.
        self._ai_active = active

    def feed_frame(self, jpeg_bytes: bytes, telemetry: dict = None):
        """
        Feed a new frame into the buffer.
        """
        with self._lock:
            self._raw_frame = jpeg_bytes
            
            # Only update display frame if AI is NOT active.
            # If AI is active, it is responsible for setting display frame.
            if not getattr(self, '_ai_active', False):
                self._display_frame = jpeg_bytes
            
            if telemetry:
                self._telemetry.update(telemetry)
        
        self._update_fps()
    
    def get_frame(self) -> Optional[bytes]:
        """Get the latest display frame (JPEG bytes)."""
        with self._lock:
            return self._display_frame
            
    def get_raw_frame(self) -> Optional[bytes]:
        """Get the latest raw frame for AI processing."""
        with self._lock:
            return self._raw_frame

    def set_display_frame(self, jpeg_bytes: bytes):
        """Set the processed frame for display."""
        with self._lock:
            self._display_frame = jpeg_bytes

    def get_telemetry(self) -> dict:
        """Get current telemetry data."""
        with self._lock:
            return self._telemetry.copy()
    
    def update_telemetry(self, data: dict):
        """Update telemetry data from external source."""
        with self._lock:
            self._telemetry.update(data)
    
    def start(self):
        """Resume receiving."""
        self._running = True
    
    def stop(self):
        """Stop receiving."""
        self._running = False


# Development test mode - run directly to test
if __name__ == '__main__':
    import sys
    
    # Parse mode from command line
    mode = sys.argv[1] if len(sys.argv) > 1 else 'webcam'
    
    if mode == 'udp':
        fb = FrameBuffer(mode='udp', port=9999)
    elif mode == 'http':
        # Example: python camera_reassembler.py http http://192.168.1.10/stream
        url = sys.argv[2] if len(sys.argv) > 2 else None
        fb = FrameBuffer(mode='http', http_url=url)
    else:
        fb = FrameBuffer(mode='webcam', camera_index=0)
    
    print("Press Ctrl+C to stop...")
    
    try:
        while True:
            frame = fb.get_frame()
            telemetry = fb.get_telemetry()
            
            if frame:
                print(f"Frame: {len(frame)} bytes | FPS: {telemetry['fps']} | State: {telemetry['state']}")
            else:
                print("Waiting for frame...")
            
            time.sleep(0.5)
    
    except KeyboardInterrupt:
        fb.stop()
        print("\nStopped.")
