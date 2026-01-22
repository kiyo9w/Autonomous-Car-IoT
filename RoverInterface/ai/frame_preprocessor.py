# frame_preprocessor.py - Frame Processing Utilities
"""
Utilities for converting and preprocessing camera frames
for different AI model input requirements.
"""

import io
import numpy as np
from PIL import Image
from typing import Optional, Tuple


class FramePreprocessor:
    """Handles frame format conversions and preprocessing"""
    
    def __init__(self, target_size: Tuple[int, int] = (320, 240)):
        """
        Initialize preprocessor.
        
        Args:
            target_size: (width, height) for resizing frames
        """
        self.target_size = target_size
    
    def jpeg_to_pil(self, jpeg_bytes: bytes) -> Optional[Image.Image]:
        """
        Convert JPEG bytes to PIL Image.
        
        Args:
            jpeg_bytes: Raw JPEG data
            
        Returns:
            PIL Image or None if conversion fails
        """
        if not jpeg_bytes:
            return None
        try:
            return Image.open(io.BytesIO(jpeg_bytes)).convert('RGB')
        except Exception:
            return None
    
    def jpeg_to_numpy(self, jpeg_bytes: bytes) -> Optional[np.ndarray]:
        """
        Convert JPEG bytes to numpy array (RGB).
        
        Args:
            jpeg_bytes: Raw JPEG data
            
        Returns:
            numpy array (H, W, 3) or None if conversion fails
        """
        pil_img = self.jpeg_to_pil(jpeg_bytes)
        if pil_img is None:
            return None
        return np.array(pil_img)
    
    def resize_pil(self, image: Image.Image) -> Image.Image:
        """Resize PIL image to target size"""
        return image.resize(self.target_size, Image.Resampling.LANCZOS)
    
    def resize_numpy(self, array: np.ndarray) -> np.ndarray:
        """Resize numpy array to target size"""
        pil_img = Image.fromarray(array)
        resized = self.resize_pil(pil_img)
        return np.array(resized)
    
    def preprocess_for_yolo(self, jpeg_bytes: bytes) -> Optional[np.ndarray]:
        """
        Preprocess frame for YOLO inference.
        
        Args:
            jpeg_bytes: Raw JPEG data
            
        Returns:
            numpy array ready for YOLO or None
        """
        arr = self.jpeg_to_numpy(jpeg_bytes)
        if arr is None:
            return None
        # YOLO expects RGB, which we already have
        return arr
    
    def preprocess_for_vlm(self, jpeg_bytes: bytes) -> Optional[Image.Image]:
        """
        Preprocess frame for VLM inference.
        
        Args:
            jpeg_bytes: Raw JPEG data
            
        Returns:
            PIL Image ready for VLM or None
        """
        pil_img = self.jpeg_to_pil(jpeg_bytes)
        if pil_img is None:
            return None
        # Resize for faster VLM processing
        return self.resize_pil(pil_img)
    
    def duplicate_frame(self, jpeg_bytes: bytes) -> Tuple[Optional[np.ndarray], Optional[Image.Image]]:
        """
        Create copies for parallel processing by YOLO and VLM.
        
        Args:
            jpeg_bytes: Raw JPEG data
            
        Returns:
            Tuple of (numpy_for_yolo, pil_for_vlm)
        """
        pil_img = self.jpeg_to_pil(jpeg_bytes)
        if pil_img is None:
            return None, None
        
        yolo_input = np.array(pil_img)
        vlm_input = self.resize_pil(pil_img)
        
        return yolo_input, vlm_input
