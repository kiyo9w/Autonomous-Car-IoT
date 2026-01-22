# Image Generation Prompts for Rescue Rover Report

These prompts are designed to generate professional, publication-ready figures for the missing placeholders.

## Chapter 2: System Architecture

### Figure 2.1: Hybrid Cloud System Overview
**Filename:** `figures/software/system_overview_hybrid.png`
**Type:** Technical Diagram
**Prompt:**
> A clean, professional high-level system architecture diagram for a robotics system. White background. Four distinct nodes connected by lines. 
> 1.  **Left Node:** "Rover (Edge Tier 1)" - icon of a small wheeled robot. 
> 2.  **Middle-Left Node:** "Gateway (Edge Tier 2)" - icon of a small development board.
> 3.  **Middle-Right Node:** "Host (Edge Tier 3)" - icon of a MacBook or laptop.
> 4.  **Right Node:** "Cloud (Cloud Tier)" - icon of a server or cloud symbol with "Google Colab / H100" text.
> **Arrows/Links:** 
> - "ESP-NOW" between Rover and Gateway.
> - "USB Serial" between Gateway and Host.
> - "WiFi UDP" between Rover and Host.
> - "Internet/HTTP" between Host and Cloud.
> **Style:** Flat vector art, technical, blue and gray color scheme, high contrast, academic paper style.

### Figure 2.2: Hybrid Intelligence Pyramid
**Filename:** `figures/software/hybrid_layers_cloud.png`
**Type:** Conceptual Diagram
**Prompt:**
> A three-level pyramid diagram illustrating a hierarchical AI architecture. White background.
> **Bottom Layer (Base):** Wide, labeled "Layer 1: Reactive Control". Text inside: "Firmware, Reflexes, SAFETY". Color: Red/Pink.
> **Middle Layer:** Medium, labeled "Layer 2: Tactical AI". Text inside: "Local YOLO, Object Detection, SPEED". Color: Blue/Cyan.
> **Top Layer (Tip):** Narrow, labeled "Layer 3: Strategic AI". Text inside: "Cloud VLM, Reasoning, INTELLIGENCE". Color: Purple/Violet.
> **Annotations:** Arrow on the side pointing up labeled "Intelligence". Arrow on the side pointing down labeled "Control Frequency".
> **Style:** Modern infographic, clean lines, professional font (sans-serif).

### Figure 2.3: Hybrid Data Flow
**Filename:** `figures/software/hybrid_data_flow.png`
**Type:** Data Flow Diagram
**Prompt:**
> A data flow diagram showing two control loops side-by-side.
> **Left Loop (Fast):** "Local Loop (30Hz)". Circular flow between [Camera] -> [Host YOLO] -> [Motor Control]. Arrows are thick and bold. Color: Green.
> **Right Loop (Slow):** "Cloud Loop (0.5Hz)". Dashed lines extending from Host to Cloud Server and back. [Host] -> [Internet] -> [Cloud VLM] -> [Internet] -> [Host]. Arrows are thinner or dashed. Color: Orange.
> **Style:** Engineering schematic, block diagram, clear labels, distinct difference between the fast local loop and slow remote loop.

---

## Chapter 6: Testing Results

### Figure 6.1: Test Environment Photograph
**Filename:** `figures/hardware/test_environment.jpg`
**Type:** Photo-realistic
**Prompt:**
> A realistic photograph of a robotics testing environment inside a large room or corridor.
> **Scene:** A clean floor with an obstacle course set up.
> **Elements:** Orange traffic cones, cardboard boxes serving as walls, a wooden ramp. A small 4-wheeled robot (Rescue Rover) is visible in the foreground or mid-ground.
> **Lighting:** Bright, even indoor lighting (fluorescent or daylight).
> **Perspective:** Eye-level or slightly elevated wide shot showing the layout of the course.
> **Style:** Documentary photography, sharp focus, realistic textures.

### Figure 6.3: Packet Loss vs Distance
**Filename:** `figures/charts/packet_loss_vs_distance.png`
**Type:** Line Chart
**Prompt:**
> A professional scientific line chart. White background.
> **X-axis:** "Distance (meters)" ranging from 0 to 50.
> **Y-axis:** "Packet Loss (%)" ranging from 0% to 100%.
> **Curve:** An exponential curve that is near 0% until 20m, then rises sharply after 30m, reaching near 100% at 50m.
> **Style:** Publication quality plot (Matplotlib/Seaborn style). Grid lines present. Line color: Red. clear axis labels.

### Figure 6.4: FPS Over Time
**Filename:** `figures/charts/fps_over_time.png`
**Type:** Time Series Chart
**Prompt:**
> A professional line chart showing frame rate stability.
> **X-axis:** "Time (seconds)" from 0 to 300.
> **Y-axis:** "FPS" ranging from 0 to 35.
> **Data:** A noisy but stable blue line hovering around 30 FPS.
> **Event:** At t=150, a sudden drop to 0 FPS labeled "Connection Drop", followed by a recovery to 30 FPS at t=160 labeled "Reconnection".
> **Style:** Matplotlib style, grid enabled, clear typography.

### Figure 6.5: JPEG Quality Comparison
**Filename:** `figures/software/jpeg_comparison.png`
**Type:** Composite Image
**Prompt:**
> A composite image showing the same scene (a room with a chair) at three different JPEG quality levels.
> **Left Panel:** "Quality 10". Visibly blocky, high compression artifacts, pixelated.
> **Middle Panel:** "Quality 30". Decent quality, minor artifacts, balanced.
> **Right Panel:** "Quality 50". Sharp, clear, high detail.
> **Layout:** Three panels side-by-side horizontally. Labels at the bottom of each panel.
> **Subject:** An office chair or rescue mannequin in a room.

### Figure 6.6: Path Deviation Test
**Filename:** `figures/hardware/track_deviation.png`
**Type:** Diagram / Overhead Visualization
**Prompt:**
> An overhead visualization of a robot's path.
> **Background:** A grid representing the floor (1m x 1m squares).
> **Lines:** 
> - A straight black dashed line labeled "Ideal Path" (Start to Goal).
> - A solid blue line labeled "Actual Path" that wavers slightly but follows the general direction.
> **Annotation:** A red bracket showing "Max Deviation < 15cm".
> **Style:** Technical visualization, clean vector graphics.

### Figure 6.7: Turning Trace
**Filename:** `figures/hardware/turning_trace.png`
**Type:** Visualization
**Prompt:**
> An overhead path trace of a skid-steer robot performing a 360-degree point turn.
> **Visual:** A chaotic "scribble" or tight spiral of wheel tracks centered on a single point.
> **Annotation:** Text "Point Turn Centroid".
> **Context:** Shows that the robot stays mostly in place while rotating, but drives slightly due to wheel slip.
> **Style:** Technical diagram, top-down view.

### Figure 6.8: Precision-Recall Curves
**Filename:** `figures/charts/precision_recall_curve.png`
**Type:** Scientific Plot
**Prompt:**
> A Precision-Recall curve plot for object detection.
> **X-axis:** Recall (0.0 to 1.0).
> **Y-axis:** Precision (0.0 to 1.0).
> **Data:** Three colored curves starting at (0,1) and curving down to (1,0).
> - "Person" (Green, high area under curve).
> - "Chair" (Blue, medium area).
> - "Bottle" (Orange, lower area).
> **Style:** Academic chart, legend in top right, grid lines.

### Figure 6.9: Inference Time Distribution
**Filename:** `figures/charts/inference_time_histogram.png`
**Type:** Histogram
**Prompt:**
> A histogram chart of inference times.
> **X-axis:** "Inference Time (ms)". Range 20ms to 50ms.
> **Y-axis:** "Frequency".
> **Data:** A normal distribution (bell curve) centered around 30ms.
> **Style:** Matplotlib style, blue bars, black edges.

### Figure 6.10: Ultrasonic Accuracy Plot
**Filename:** `figures/charts/ultrasonic_accuracy.png`
**Type:** Scatter/Line Plot with Error Bars
**Prompt:**
> An accuracy plot for a distance sensor.
> **X-axis:** "True Distance (cm)" from 0 to 400.
> **Y-axis:** "Measured Distance (cm)" from 0 to 400.
> **Data:** A perfect 45-degree diagonal line (y=x).
> **Error Bars:** Small vertical error bars at each data point (every 50cm), showing slight noise (+/- 2cm).
> **Deviation:** After 300cm, the points start to diverge/scatter more significantly.
> **Style:** Scientific plot, clear markers.

### Figure 6.11: Battery Discharge Curve
**Filename:** `figures/charts/voltage_discharge.png`
**Type:** Line Chart
**Prompt:**
> A battery discharge curve.
> **X-axis:** "Time (minutes)" from 0 to 180.
> **Y-axis:** "Voltage (V)" from 9.0 to 12.6.
> **Data:** A curve starting at 12.6V, dropping quickly to 11.5V, then a long slow decline to 10.5V, then a sharp drop to 9.9V at 140 minutes.
> **Annotations:** "LiPo 3S Discharge Profile".
> **Style:** Engineering chart.

### Figure 6.12: Thermal Camera Image
**Filename:** `figures/hardware/thermal_image.jpg`
**Type:** Thermal Visualization
**Prompt:**
> A thermal camera heatmap image of a robot chassis.
> **Visual:** The shape of the robot is visible.
> **Hotspots:** Bright red/white area over the motor driver heatsink (hottest). Warm yellow/orange area over the ESP32 chip. Cool blue/purple over the battery and plastic chassis.
> **Scale:** A color bar on the right side labeled "Temp (°C)" ranging from 25°C (Blue) to 60°C (White).
> **Style:** Authentic thermal imaging look (Ironbow or Rainbow palette).
