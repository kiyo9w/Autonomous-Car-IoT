


# camera_reassembler.py
import time
import threading

class FrameBuffer:
    def __init__(self):
        self._frame = None
        self._telemetry = {}
        self._running = True
        self._lock = threading.Lock()

    def start(self):
        self._running = True

    def stop(self):
        self._running = False

    def feed_frame(self, jpeg_bytes: bytes, telemetry: dict = None):
        with self._lock:
            self._frame = jpeg_bytes
            if telemetry:
                self._telemetry = telemetry

    def get_frame(self):
        with self._lock:
            return self._frame

    def get_telemetry(self):
        with self._lock:
            return self._telemetry

# Example: local webcam feeder for dev
if __name__ == '__main__':
    import cv2
    fb = FrameBuffer()
    cap = cv2.VideoCapture(0)
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        _, jpeg = cv2.imencode('.jpg', frame)
        fb.feed_frame(jpeg.tobytes(), telemetry={'distance': 100, 'battery': 7.9, 'state': 'CONNECTED'})
        time.sleep(0.05)
