# strategic_navigator.py - VLM Navigation Layer
"""
Strategic Layer: Vision Language Model for high-level navigation decisions.
Runs at 0.5Hz (every 2 seconds) to analyze scene and provide steering guidance.
"""

import json
import re
import time
from dataclasses import dataclass
from typing import Optional
from PIL import Image
import io

from .config import AIConfig, DEFAULT_CONFIG, SteeringCommand, NavigationGoal


@dataclass
class StrategicResult:
    """Result from VLM navigation analysis"""
    hazard: bool
    nav_goal: NavigationGoal
    steering: SteeringCommand
    reasoning: str
    inference_time_ms: float
    raw_response: str


class StrategicNavigator:
    """
    Strategic decision maker using VLM (Qwen2.5-VL).
    Supports Hybrid Mode:
    - Primary: HTTP request to Remote Colab Server (A100 GPU)
    - Fallback: None (returns error state if cloud fails, safer than slow local run)
    """
    
    def __init__(self, config: AIConfig = None):
        """
        Initialize VLM navigator.
        
        Args:
            config: AI configuration, uses default if None
        """
        self.config = config or DEFAULT_CONFIG
        self._last_inference_time = 0
        import requests
        self._requests = requests  # Lazy load requests
        
        if not self.config.use_remote_vlm:
            print("⚠️ Local VLM disabled in favor of Hybrid Cloud Architecture.")
            print("Please set up Colab server and update config.py")
    
    def _parse_json_response(self, response: str) -> dict:
        """Extract JSON from VLM response, handling various formats"""
        # Try to find JSON in the response
        json_patterns = [
            r'\{[^{}]*\}',  # Simple JSON object
            r'```json\s*(\{[^`]*\})\s*```',  # Markdown code block
            r'```\s*(\{[^`]*\})\s*```',  # Generic code block
        ]
        
        for pattern in json_patterns:
            match = re.search(pattern, response, re.DOTALL)
            if match:
                try:
                    json_str = match.group(1) if '```' in pattern else match.group(0)
                    return json.loads(json_str)
                except json.JSONDecodeError:
                    continue
        
        # Fallback: return safe defaults
        return {
            "hazard": False,
            "nav_goal": "follow_path",
            "steering": "center",
            "reasoning": "Could not parse VLM response"
        }
    
    def can_run(self) -> bool:
        """Check if cooldown has elapsed since last inference"""
        elapsed = time.time() - self._last_inference_time
        return elapsed >= self.config.vlm_cooldown_seconds
    
    def analyze(self, image: Image.Image, force: bool = False) -> Optional[StrategicResult]:
        """
        Analyze scene via Remote VLM.
        """
        if not force and not self.can_run():
            return None
        
        if not self.config.use_remote_vlm:
            # Fallback for when cloud is disabled explicitly
            return StrategicResult(
                hazard=False,
                nav_goal=NavigationGoal.FOLLOW_PATH,
                steering=SteeringCommand.STOP,
                reasoning="Remote VLM not configured",
                inference_time_ms=0,
                raw_response=""
            )
            
        start_time = time.time()
        self._last_inference_time = start_time
        
        try:
            # Prepare image for upload
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='JPEG', quality=85)
            img_bytes = img_byte_arr.getvalue()
            
            # Send to Colab
            response = self._requests.post(
                self.config.remote_vlm_url,
                files={"file": ("frame.jpg", img_bytes, "image/jpeg")},
                timeout=self.config.remote_timeout
            )
            
            if response.status_code != 200:
                raise Exception(f"HTTP {response.status_code}: {response.text}")
            
            # Parse Result
            api_result = response.json()
            generated_text = api_result.get("result", "")
            
            # Parse JSON from text
            parsed = self._parse_json_response(generated_text)
            
            inference_time = (time.time() - start_time) * 1000
            
            return StrategicResult(
                hazard=parsed.get("hazard", False),
                nav_goal=NavigationGoal(parsed.get("nav_goal", "follow_path")),
                steering=SteeringCommand(parsed.get("steering", "center")),
                reasoning=parsed.get("reasoning", ""),
                inference_time_ms=inference_time,
                raw_response=generated_text
            )
            
        except Exception as e:
            # Network error or timeout - Fail Safe
            inference_time = (time.time() - start_time) * 1000
            print(f"❌ Remote VLM Error: {e}")
            return StrategicResult(
                hazard=False, # Don't panic stop, just drift
                nav_goal=NavigationGoal.FOLLOW_PATH,
                steering=SteeringCommand.CENTER, # Maintain course
                reasoning=f"Network Error: {str(e)[:30]}",
                inference_time_ms=inference_time,
                raw_response=""
            )

    def is_ready(self) -> bool:
        """Check if remote config is present"""
        return self.config.use_remote_vlm and "ngrok" in self.config.remote_vlm_url
    
    def get_cooldown_remaining(self) -> float:
        """Get seconds until next inference is allowed"""
        elapsed = time.time() - self._last_inference_time
        remaining = self.config.vlm_cooldown_seconds - elapsed
        return max(0, remaining)
