# config.py - AI Module Configuration
"""
Configuration for Tactical (YOLO) and Strategic (VLM) AI layers.
Optimized for Apple Silicon Macs with MLX acceleration.
"""

from dataclasses import dataclass, field
from typing import Literal
from enum import Enum


class SteeringCommand(str, Enum):
    """Possible steering commands from VLM"""
    LEFT = "left"
    RIGHT = "right"
    CENTER = "center"
    STOP = "stop"


class NavigationGoal(str, Enum):
    """Navigation goal types from VLM"""
    OPEN_SPACE = "open_space"
    FOLLOW_PATH = "follow_path"
    AVOID_OBSTACLE = "avoid_obstacle"
    TURN_AROUND = "turn_around"


@dataclass
class AIConfig:
    """Central configuration for AI modules"""
    
    # Model paths
    yolo_model: str = "yolov8n.pt"  # Nano for speed
    vlm_model: str = "mlx-community/Qwen2.5-VL-3B-Instruct-4bit"
    
    # Remote VLM Config (Hybrid Architecture)
    use_remote_vlm: bool = True
    remote_vlm_url: str = "https://informal-leona-adorably.ngrok-free.dev/analyze"  # Live Colab URL
    remote_timeout: float = 3.0  # Seconds to wait for cloud response
    
    # Inference settings
    yolo_confidence: float = 0.5
    yolo_iou_threshold: float = 0.45
    vlm_max_tokens: int = 150
    vlm_temperature: float = 0.1  # Low for deterministic output
    
    # Latency budgets (ms)
    yolo_target_latency: int = 33  # 30 FPS
    vlm_target_latency: int = 2000  # 0.5 Hz
    vlm_cooldown_seconds: float = 2.0
    
    # Frame settings
    input_width: int = 320
    input_height: int = 240
    
    # Safety thresholds
    person_stop_threshold: float = 0.4  # Stop if person bbox > 40% of frame
    obstacle_classes: list = field(default_factory=lambda: [
        "person", "car", "bicycle", "motorcycle", "dog", "cat"
    ])
    
    # VLM Prompt Template
    vlm_system_prompt: str = """You are a robot navigator. Analyze the spatial gaps and obstacles.
Your task is to guide a rescue rover safely through the environment."""

    vlm_user_prompt_template: str = """Analyze this camera view and output ONLY a JSON object:
{{
    "hazard": boolean (true if immediate danger),
    "nav_goal": "open_space" | "follow_path" | "avoid_obstacle" | "turn_around",
    "steering": "left" | "right" | "center" | "stop",
    "reasoning": "brief explanation (max 20 words)"
}}

Focus on: Is there a walkable path at least 1 meter wide? Where should the rover steer?"""


# Default config instance
DEFAULT_CONFIG = AIConfig()
