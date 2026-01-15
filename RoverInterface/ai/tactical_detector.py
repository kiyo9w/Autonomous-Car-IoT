# tactical_detector.py - YOLOv8 Object Detection Layer
"""
Tactical Layer: Fast object detection for immediate safety responses.
Runs at 30Hz to detect people and obstacles.
"""

import time
from dataclasses import dataclass
from typing import List, Optional, Tuple
import numpy as np

from .config import AIConfig, DEFAULT_CONFIG


@dataclass
class Detection:
    """Single detection result"""
    class_name: str
    confidence: float
    bbox: Tuple[float, float, float, float]  # x1, y1, x2, y2 normalized
    area_ratio: float  # Fraction of frame covered by bbox


@dataclass
class TacticalResult:
    """Result from tactical detection"""
    detections: List[Detection]
    should_stop: bool
    stop_reason: Optional[str]
    inference_time_ms: float


class TacticalDetector:
    """
    YOLOv8-based object detector for tactical safety layer.
    Detects people and obstacles to trigger immediate stops.
    """
    
    def __init__(self, config: AIConfig = None):
        """
        Initialize YOLO detector.
        
        Args:
            config: AI configuration, uses default if None
        """
        self.config = config or DEFAULT_CONFIG
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load YOLOv8 model with CoreML acceleration if available"""
        try:
            from ultralytics import YOLO
            self.model = YOLO(self.config.yolo_model)
            print(f"✅ YOLO model loaded: {self.config.yolo_model}")
        except ImportError:
            print("⚠️ ultralytics not installed. Run: pip install ultralytics")
            self.model = None
        except Exception as e:
            print(f"❌ Failed to load YOLO model: {e}")
            self.model = None
    
    def detect(self, frame: np.ndarray) -> TacticalResult:
        """
        Run object detection on frame.
        
        Args:
            frame: RGB numpy array (H, W, 3)
            
        Returns:
            TacticalResult with detections and safety decision
        """
        start_time = time.time()
        
        if self.model is None:
            return TacticalResult(
                detections=[],
                should_stop=False,
                stop_reason=None,
                inference_time_ms=0
            )
        
        # Run inference
        results = self.model(
            frame,
            conf=self.config.yolo_confidence,
            iou=self.config.yolo_iou_threshold,
            verbose=False
        )
        
        frame_h, frame_w = frame.shape[:2]
        frame_area = frame_h * frame_w
        
        detections = []
        should_stop = False
        stop_reason = None
        
        for result in results:
            if result.boxes is None:
                continue
                
            for box in result.boxes:
                class_id = int(box.cls[0])
                class_name = self.model.names[class_id]
                confidence = float(box.conf[0])
                
                # Get normalized bbox
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                bbox_area = (x2 - x1) * (y2 - y1)
                area_ratio = bbox_area / frame_area
                
                detection = Detection(
                    class_name=class_name,
                    confidence=confidence,
                    bbox=(x1/frame_w, y1/frame_h, x2/frame_w, y2/frame_h),
                    area_ratio=area_ratio
                )
                detections.append(detection)
                
                # Check for safety stop conditions
                if class_name in self.config.obstacle_classes:
                    if area_ratio >= self.config.person_stop_threshold:
                        should_stop = True
                        stop_reason = f"{class_name} detected ({area_ratio*100:.0f}% of frame)"
        
        inference_time = (time.time() - start_time) * 1000
        
        return TacticalResult(
            detections=detections,
            should_stop=should_stop,
            stop_reason=stop_reason,
            inference_time_ms=inference_time
        )
    
    def is_ready(self) -> bool:
        """Check if model is loaded and ready"""
        return self.model is not None
