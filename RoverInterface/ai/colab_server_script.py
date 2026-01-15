# colab_server_script.py - RUN THIS ON GOOGLE COLAB (A100/T4 GPU)
"""
Script to host Qwen2.5-VL-7B-Instruct on Google Colab Enterprise (or free T4).
Exposes an API via ngrok for the Rescue Rover to connect to.

INSTRUCTIONS:
1. Copy this entire script into a code cell in Google Colab.
2. Ensure Runtime > Change Runtime Type > GPU (A100 preferred, T4 works).
3. Run the cell.
4. Copy the "public_url" printed at the end (e.g., https://xyz.ngrok-free.app).
5. Paste that URL into your Mac's `config.py` as `REMOTE_VLM_URL`.
"""

# --- 1. Install Dependencies ---
import subprocess
print("🚀 Installing dependencies (vLLM, ngrok, fastapi)...")
subprocess.run("pip install -q vllm pyngrok uvicorn fastapi python-multipart nest-asyncio pillow", shell=True)

# --- 2. Imports ---
import uvicorn
import nest_asyncio
from pyngrok import ngrok
from fastapi import FastAPI, UploadFile, File
from vllm import LLM, SamplingParams
from PIL import Image
import io
import json

# --- 3. Configuration ---
# Use 7B model for A100. If using T4 (Free), switch to "Qwen/Qwen2.5-VL-3B-Instruct"
MODEL_ID = "Qwen/Qwen2.5-VL-7B-Instruct" 
# MODEL_ID = "Qwen/Qwen2.5-VL-3B-Instruct" # Uncomment for Free T4 GPU

# Ngrok Auth Token (Optional but recommended for stability)
# ngrok.set_auth_token("YOUR_TOKEN_HERE")

# --- 4. Initialize Model (vLLM) ---
print(f"🔄 Loading Model: {MODEL_ID}...")
try:
    # Fix for "Engine core initialization failed":
    # 1. max_model_len=8192: Reduces context from default 128k (which crashes memory)
    # 2. gpu_memory_utilization=0.90: Leaves buffer for overhead
    # 3. limit_mm_per_prompt: Optimization for single-image inputs
    llm = LLM(
        model=MODEL_ID,
        dtype="float16",
        gpu_memory_utilization=0.90,
        trust_remote_code=True,
        max_model_len=8192,
        limit_mm_per_prompt={"image": 1}
    )
    print("✅ Model Loaded Successfully!")
except Exception as e:
    print(f"❌ Model Load Error: {e}")
    print("If OOM on T4, try the 3B model or set gpu_memory_utilization=0.8")
    raise e

# --- 5. Define API ---
app = FastAPI()

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    try:
        # Read uploaded image
        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert("RGB")
        
        # Prepare Prompt (Optimized for Navigation)
        # Note: vLLM handles images differently depending on version, 
        # but standardized chat template is safest.
        
        system_prompt = """You are a robot navigator. Analyze the scene for walkability.
Output JSON ONLY:
{
    "hazard": boolean,
    "nav_goal": "open_space" | "follow_path" | "avoid_obstacle",
    "steering": "left" | "right" | "center" | "stop",
    "reasoning": "short explanation"
}"""
        
        user_prompt = "Analyze this view. Where should I drive?"
        
        # Generate using vLLM
        # For Qwen2-VL, we pass inputs carefully. 
        # vLLM's API for VLMs is evolving, this is a robust patterns:
        
        inputs = {
            "prompt": f"{system_prompt}\nUser: <image>\n{user_prompt}\nAssistant:",
            "multi_modal_data": {"image": image},
        }
        
        sampling_params = SamplingParams(temperature=0.1, max_tokens=128)
        
        outputs = llm.generate(inputs, sampling_params=sampling_params)
        generated_text = outputs[0].outputs[0].text
        
        return {"result": generated_text}
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"❌ ANALYZE ERROR: {error_msg}")
        traceback.print_exc()
        # Return the ACTUAL error so client can debug
        return {"error": error_msg, "result": json.dumps({"hazard": True, "steering": "stop", "reasoning": f"ERR: {error_msg[:50]}"})}

# --- 6. Start Server ---
# Open Tunnel
port = 8000
public_url = ngrok.connect(port).public_url
print(f"\nExample config.py setting:\nREMOTE_VLM_URL = \"{public_url}/analyze\"")
print(f"🚀 API Live at: {public_url}")

# Run FastAPI
nest_asyncio.apply()
uvicorn.run(app, port=port)
