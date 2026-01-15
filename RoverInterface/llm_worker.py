    def _tactical_loop(self):
        """Fast loop for object detection (30Hz target)"""
        frame_count = 0
        start_time = time.time()
        
        while self._running:
            if not self._enabled:
                time.sleep(0.1)
                continue
            
            frame_bytes = self.frame_buffer.get_raw_frame() # Get RAW
            if frame_bytes is None:
                time.sleep(0.033)
                continue
            
            # Decode for processing
            import cv2
            import numpy as np
            nparr = np.frombuffer(frame_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                continue
                
            if self.tactical and self.tactical.is_ready():
                result = self.tactical.detect(img)
                
                # Draw boxes
                for det in result.detections:
                    h, w = img.shape[:2]
                    x1, y1, x2, y2 = det.bbox
                    # Scale back to pixels
                    p1 = (int(x1 * w), int(y1 * h))
                    p2 = (int(x2 * w), int(y2 * h))
                    
                    color = (0, 0, 255) if "person" in det.class_name else (0, 255, 0)
                    cv2.rectangle(img, p1, p2, color, 2)
                    cv2.putText(img, f"{det.class_name} {det.confidence:.2f}", 
                              (p1[0], p1[1]-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

                # Safety logic...
                if result.should_stop:
                    cmd = RoverCommand.stop(
                        priority=CommandPriority.TACTICAL,
                        source="YOLO",
                        reason=result.stop_reason or "Obstacle detected"
                    )
                    self.arbiter.submit(cmd)
                    self._log(f"🛑 TACTICAL STOP: {result.stop_reason}")
                else:
                    self.arbiter.clear(CommandPriority.TACTICAL)

                frame_count += 1
                self.stats['tactical_detections'] = len(result.detections)

            # Update FrameBuffer with ANNOTATED frame for display
            _, jpeg = cv2.imencode('.jpg', img)
            self.frame_buffer.set_display_frame(jpeg.tobytes())
            
            # Update FPS every second
            elapsed = time.time() - start_time
            if elapsed >= 1.0:
                self.stats['tactical_fps'] = frame_count / elapsed
                frame_count = 0
                start_time = time.time()
            
            time.sleep(0.033)
"""
Background worker that runs Tactical (YOLO) and Strategic (VLM) AI layers.
Feeds decisions to the CommandArbiter for priority-based execution.
"""

import time
import threading
from typing import Optional

from ai import (
    TacticalDetector, 
    StrategicNavigator, 
    CommandArbiter,
    FramePreprocessor,
    AIConfig
)
from ai.command_arbiter import CommandPriority, RoverCommand
from ai.config import SteeringCommand


class AIWorker:
    """
    Orchestrates Tactical and Strategic AI layers.
    Runs detection at 30Hz and VLM analysis at 0.5Hz.
    """
    
    def __init__(self, frame_buffer, mission_log: list, arbiter: CommandArbiter):
        """
        Initialize AI worker.
        
        Args:
            frame_buffer: FrameBuffer instance for camera frames
            mission_log: List to append mission log entries
            arbiter: CommandArbiter for command output
        """
        self.frame_buffer = frame_buffer
        self.mission_log = mission_log
        self.arbiter = arbiter
        self.config = AIConfig()
        
        self.preprocessor = FramePreprocessor()
        self.tactical: Optional[TacticalDetector] = None
        self.strategic: Optional[StrategicNavigator] = None
        
        self._running = False
        self._enabled = True
        self._tactical_thread: Optional[threading.Thread] = None
        self._strategic_thread: Optional[threading.Thread] = None
        
        # Stats
        self.stats = {
            'tactical_fps': 0,
            'strategic_last_run': 0,
            'tactical_detections': 0,
            'strategic_decisions': 0
        }
    
    def _load_models(self):
        """Load AI models (can be slow, run in background)"""
        self._log("🔄 Loading AI models...")
        
        try:
            self.tactical = TacticalDetector(self.config)
            if self.tactical.is_ready():
                self._log("✅ Tactical (YOLO) ready")
            else:
                self._log("⚠️ Tactical (YOLO) not available")
        except Exception as e:
            self._log(f"❌ Tactical load error: {e}")
            self.tactical = None
        
        try:
            self.strategic = StrategicNavigator(self.config)
            if self.strategic.is_ready():
                self._log("✅ Strategic (VLM) ready")
            else:
                self._log("⚠️ Strategic (VLM) not available")
        except Exception as e:
            self._log(f"❌ Strategic load error: {e}")
            self.strategic = None
    
    def _log(self, message: str):
        """Add entry to mission log"""
        entry = f"🤖 {time.strftime('%H:%M:%S')} {message}"
        self.mission_log.append(entry)
        if len(self.mission_log) > 200:
            self.mission_log.pop(0)
        print(entry)
    
    def _tactical_loop(self):
        """Fast loop for object detection (30Hz target)"""
        frame_count = 0
        start_time = time.time()
        
        while self._running:
            if not self._enabled:
                time.sleep(0.1)
                continue
            
            frame = self.frame_buffer.get_frame()
            if frame is None:
                time.sleep(0.033)
                continue
            
            if self.tactical is None or not self.tactical.is_ready():
                time.sleep(0.1)
                continue
            
            # Preprocess and detect
            yolo_input = self.preprocessor.preprocess_for_yolo(frame)
            if yolo_input is None:
                continue
            
            result = self.tactical.detect(yolo_input)
            frame_count += 1
            self.stats['tactical_detections'] = len(result.detections)
            
            # Submit command based on detection
            if result.should_stop:
                cmd = RoverCommand.stop(
                    priority=CommandPriority.TACTICAL,
                    source="YOLO",
                    reason=result.stop_reason or "Obstacle detected"
                )
                self.arbiter.submit(cmd)
                self._log(f"🛑 TACTICAL STOP: {result.stop_reason}")
            else:
                # Clear tactical stop if no obstacle
                self.arbiter.clear(CommandPriority.TACTICAL)
            
            # Update FPS every second
            elapsed = time.time() - start_time
            if elapsed >= 1.0:
                self.stats['tactical_fps'] = frame_count / elapsed
                frame_count = 0
                start_time = time.time()
            
            time.sleep(0.033)  # ~30 FPS cap
    
    def _strategic_loop(self):
        """Slow loop for VLM navigation (0.5Hz)"""
        while self._running:
            if not self._enabled:
                time.sleep(0.5)
                continue
            
            if self.strategic is None or not self.strategic.is_ready():
                time.sleep(1.0)
                continue
            
            if not self.strategic.can_run():
                time.sleep(0.5)
                continue
            
            frame = self.frame_buffer.get_frame()
            if frame is None:
                time.sleep(0.5)
                continue
            
            # Preprocess for VLM
            vlm_input = self.preprocessor.preprocess_for_vlm(frame)
            if vlm_input is None:
                continue
            
            # Run VLM analysis
            result = self.strategic.analyze(vlm_input)
            if result is None:
                continue
            
            self.stats['strategic_last_run'] = time.time()
            self.stats['strategic_decisions'] += 1
            
            # Log reasoning
            self._log(f"🧠 VLM: {result.steering.value} - {result.reasoning}")
            
            # Submit command (lower priority than tactical)
            if result.hazard:
                cmd = RoverCommand.stop(
                    priority=CommandPriority.STRATEGIC,
                    source="VLM",
                    reason="Hazard detected"
                )
            elif result.steering == SteeringCommand.STOP:
                cmd = RoverCommand.stop(
                    priority=CommandPriority.STRATEGIC,
                    source="VLM",
                    reason=result.reasoning
                )
            else:
                cmd = RoverCommand.steer(
                    priority=CommandPriority.STRATEGIC,
                    source="VLM",
                    direction=result.steering.value,
                    speed=0.3
                )
            
            self.arbiter.submit(cmd)
            
            time.sleep(0.5)  # Check cooldown every 500ms
    
    def start(self):
        """Start AI worker threads"""
        if self._running:
            return
        
        self._running = True
        
        # Load models in background
        loader = threading.Thread(target=self._load_models, daemon=True)
        loader.start()
        
        # Start worker threads
        self._tactical_thread = threading.Thread(target=self._tactical_loop, daemon=True)
        self._strategic_thread = threading.Thread(target=self._strategic_loop, daemon=True)
        
        self._tactical_thread.start()
        self._strategic_thread.start()
        
        self._log("🚀 AI Worker started")
    
    def stop(self):
        """Stop AI worker threads"""
        self._running = False
        self._log("🛑 AI Worker stopped")
    
    def enable(self):
        """Enable AI processing"""
        self._enabled = True
        self._log("✅ AI enabled")
    
    def disable(self):
        """Disable AI processing (still running, but not processing)"""
        self._enabled = False
        self.arbiter.clear(CommandPriority.TACTICAL)
        self.arbiter.clear(CommandPriority.STRATEGIC)
        self._log("⏸️ AI disabled")
    
    def is_enabled(self) -> bool:
        """Check if AI is enabled"""
        return self._enabled
    
    def get_status(self) -> dict:
        """Get AI status for API"""
        return {
            'enabled': self._enabled,
            'running': self._running,
            'tactical_ready': self.tactical.is_ready() if self.tactical else False,
            'strategic_ready': self.strategic.is_ready() if self.strategic else False,
            'tactical_fps': round(self.stats['tactical_fps'], 1),
            'strategic_cooldown': round(
                self.strategic.get_cooldown_remaining(), 1
            ) if self.strategic else 0,
            'stats': self.stats
        }


# Legacy compatibility - simple stub for when AI is not needed
def analyze_image_stub(jpeg_bytes: bytes) -> dict:
    """Stub for backwards compatibility"""
    return {'command': 'IDLE', 'confidence': 0.0}


def loop(frame_buffer, mission_log, serial_manager=None):
    """Legacy loop - kept for backwards compatibility but does nothing useful"""
    while True:
        time.sleep(10)  # Just keep thread alive
