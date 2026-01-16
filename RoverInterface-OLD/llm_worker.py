# llm_worker.py
import time

def analyze_image_stub(jpeg_bytes: bytes) -> dict:
    return {'command': 'MOVE_FORWARD', 'confidence': 0.95}

def loop(frame_buffer, mission_log):
    while True:
        frame = frame_buffer.get_frame()
        if frame is None:
            time.sleep(0.2)
            continue

        result = analyze_image_stub(frame)
        mission_log.append(
            f"- {time.strftime('%H:%M:%S')} LLM: "
            f"{result['command']} (p={result['confidence']:.2f})"
        )

        if len(mission_log) > 200:
            mission_log.pop(0)

        time.sleep(1.0)
