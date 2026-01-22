# test_ai.py - Simple AI Test Interface (V2 - Fixed)
"""
Temporary test script to verify AI pipeline works.
Shows webcam feed with YOLO detections and VLM decisions overlaid.
DELETE THIS FILE after testing.
"""

import cv2
import time
import requests
import io
import threading
from PIL import Image
from ultralytics import YOLO

# === CONFIG ===
WEBCAM_INDEX = 1
VLM_URL = "https://informal-leona-adorably.ngrok-free.dev/analyze"
VLM_TIMEOUT = 5.0
VLM_COOLDOWN = 2.0
YOLO_EVERY_N_FRAMES = 3  # Only run YOLO every N frames

# === INIT ===
print("🔄 Loading YOLO...")
yolo = YOLO("yolov8n.pt")
print("✅ YOLO loaded")

print(f"📷 Opening webcam {WEBCAM_INDEX}...")
cap = cv2.VideoCapture(WEBCAM_INDEX)
if not cap.isOpened():
    print("❌ Failed to open webcam!")
    exit(1)
print("✅ Webcam ready")

# State
last_vlm_time = 0
vlm_result = {"steering": "waiting...", "reasoning": "Initializing..."}
vlm_lock = threading.Lock()
tactical_status = "Scanning..."
frame_count = 0
last_yolo_boxes = []  # Cache YOLO results

def call_vlm_async(frame):
    """Send frame to remote VLM in background thread."""
    def _call():
        global vlm_result
        try:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb)
            
            buf = io.BytesIO()
            pil_img.save(buf, format='JPEG', quality=70)
            buf.seek(0)
            
            response = requests.post(
                VLM_URL,
                files={"file": ("frame.jpg", buf.getvalue(), "image/jpeg")},
                timeout=VLM_TIMEOUT
            )
            
            if response.status_code == 200:
                data = response.json()
                result_text = data.get("result", "")
                
                # DEBUG: Print raw response
                print(f"\n[DEBUG VLM RAW]: {result_text[:200]}")
                
                # Try multiple JSON extraction methods
                import json
                import re
                
                # Method 1: Find JSON object
                match = re.search(r'\{[^{}]*\}', result_text, re.DOTALL)
                if match:
                    try:
                        parsed = json.loads(match.group(0))
                        with vlm_lock:
                            vlm_result = {
                                "steering": parsed.get("steering", "unknown"),
                                "reasoning": parsed.get("reasoning", "No reason")[:40]
                            }
                        return
                    except:
                        pass
                
                # Method 2: Look for keywords directly
                result_lower = result_text.lower()
                steering = "center"
                if "left" in result_lower:
                    steering = "left"
                elif "right" in result_lower:
                    steering = "right"
                elif "stop" in result_lower:
                    steering = "stop"
                
                with vlm_lock:
                    vlm_result = {
                        "steering": steering,
                        "reasoning": result_text[:40] if result_text else "Empty response"
                    }
            else:
                with vlm_lock:
                    vlm_result = {"steering": "http_err", "reasoning": f"HTTP {response.status_code}"}
                
        except Exception as e:
            with vlm_lock:
                vlm_result = {"steering": "error", "reasoning": str(e)[:40]}
    
    threading.Thread(target=_call, daemon=True).start()

def run_yolo(frame):
    """Run YOLO and cache results."""
    global tactical_status, last_yolo_boxes
    
    results = yolo(frame, verbose=False, conf=0.5)
    last_yolo_boxes = []
    
    for r in results:
        for box in r.boxes:
            cls = int(box.cls[0])
            label = yolo.names[cls]
            
            if label == "person":
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                box_area = (x2 - x1) * (y2 - y1)
                frame_area = frame.shape[0] * frame.shape[1]
                pct = int(box_area / frame_area * 100)
                
                last_yolo_boxes.append((x1, y1, x2, y2, pct))
                
                if pct > 40:
                    tactical_status = f"🛑 STOP: Person {pct}%"
                else:
                    tactical_status = f"👤 Person {pct}%"
                return
    
    tactical_status = "✅ Path Clear"

def draw_yolo_boxes(frame):
    """Draw cached YOLO boxes on frame."""
    for (x1, y1, x2, y2, pct) in last_yolo_boxes:
        color = (0, 0, 255) if pct > 40 else (0, 255, 255)
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        cv2.putText(frame, f"PERSON {pct}%", (x1, y1 - 10),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

# === MAIN LOOP ===
print("\n" + "="*50)
print("🚀 AI TEST INTERFACE V2")
print("="*50)
print("Press 'q' to quit\n")

while True:
    ret, frame = cap.read()
    if not ret:
        continue
    
    frame_count += 1
    
    # 1. Run YOLO every N frames
    if frame_count % YOLO_EVERY_N_FRAMES == 0:
        run_yolo(frame)
    
    # Always draw cached boxes
    draw_yolo_boxes(frame)
    
    # 2. Run VLM (async, with cooldown)
    now = time.time()
    if now - last_vlm_time > VLM_COOLDOWN:
        last_vlm_time = now
        call_vlm_async(frame.copy())
    
    # 3. Draw HUD
    cv2.rectangle(frame, (10, 10), (450, 130), (0, 0, 0), -1)
    cv2.rectangle(frame, (10, 10), (450, 130), (100, 100, 100), 2)
    
    with vlm_lock:
        steer = vlm_result['steering']
        reason = vlm_result['reasoning']
    
    cv2.putText(frame, f"TACTICAL: {tactical_status}", (20, 45),
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
    cv2.putText(frame, f"VLM STEER: {steer.upper()}", (20, 80),
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
    cv2.putText(frame, f"REASON: {reason[:40]}", (20, 115),
               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
    
    # 4. Show
    cv2.imshow("AI Test V2 - Press Q to Quit", frame)
    
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
print("\n\n✅ Test ended.")
