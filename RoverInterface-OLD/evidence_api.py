#evidence_api.py
import asyncio

_frame_buffer = None
_mission_log = None

def bind_state(frame_buffer, mission_log):
    global _frame_buffer, _mission_log
    _frame_buffer = frame_buffer
    _mission_log = mission_log

async def request_manifest():
    if _mission_log is None:
        return

    _mission_log.append("📦 Fetch manifest requested")
    await asyncio.sleep(1.0)
    _mission_log.append("📁 Manifest received")
