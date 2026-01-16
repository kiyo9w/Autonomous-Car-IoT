import serial
import serial.tools.list_ports
import threading
import time
import logging

class SerialManager:
    def __init__(self, port=None, baudrate=115200):
        self.port = port
        self.baudrate = baudrate
        self.serial_conn = None
        self.running = False
        self.lock = threading.Lock()
        
        # Telemetry state
        self.telemetry = {
            'voltage': 0.0,
            'distance': 0,
            'status': 'DISCONNECTED',
            'last_update': 0
        }

    def find_port(self):
        """Auto-detect probable ESP32/CH340 serial port."""
        if self.port:
            return self.port
            
        ports = list(serial.tools.list_ports.comports())
        for p in ports:
            # Common names for ESP32/Arduino drivers on Mac/Linux/Windows
            if any(x in p.device for x in ['usbserial', 'wchusb', 'CP210']):
                print(f"✅ Found Serial Device: {p.device}")
                return p.device
        return None

    def start(self):
        """Start the serial connection thread."""
        self.running = True
        thread = threading.Thread(target=self._read_loop, daemon=True)
        thread.start()

    def _read_loop(self):
        """Background thread to read telemetry from Gateway."""
        reconnect_delay = 2
        
        while self.running:
            target_port = self.port
            
            # If no specific port set, or if previous attempt failed, try auto-detect
            if not target_port or (self.serial_conn is None and self.telemetry['status'] == 'ERROR'):
                 target_port = self.find_port()
            
            if not target_port:
                self.telemetry['status'] = 'NO_DEVICE'
                time.sleep(reconnect_delay)
                continue

            try:
                print(f"🔌 Connecting to {target_port}...")
                self.serial_conn = serial.Serial(target_port, self.baudrate, timeout=1)
                self.telemetry['status'] = 'CONNECTED'
                print(f"✅ Serial Connected to {target_port}!")
                
                # Update configured port if auto-detected
                self.port = target_port

                while self.running and self.serial_conn.is_open:
                    try:
                        line = self.serial_conn.readline().decode('utf-8', errors='ignore').strip()
                        if line:
                            self._parse_line(line)
                    except serial.SerialException:
                        print("❌ Serial connection lost")
                        break
                        
            except (OSError, serial.SerialException) as e:
                print(f"❌ Serial Connection Failed: {e}")
                self.telemetry['status'] = 'ERROR'
                self.serial_conn = None
                time.sleep(reconnect_delay)
            except Exception as e:
                print(f"❌ Unexpected Serial Error: {e}")
                self.telemetry['status'] = 'ERROR'
                self.serial_conn = None
                time.sleep(reconnect_delay)

    def _parse_line(self, line):
        """Parse incoming line: 'TELE:12.5,45' (voltage, distance)"""
        # Expected format from Gateway: "TELE:12.5,45"
        if line.startswith("TELE:"):
            try:
                data = line.replace("TELE:", "").split(',')
                if len(data) >= 2:
                    with self.lock:
                        self.telemetry['voltage'] = float(data[0])
                        self.telemetry['distance'] = int(data[1])
                        self.telemetry['last_update'] = time.time()
            except ValueError:
                pass
        
        # Also print debug output from Gateway for monitoring
        elif "TX" in line or "RX" in line or "MAC" in line:
            print(f"[Gateway] {line}")

    def send_command(self, cmd):
        """Send command to Gateway (F, B, L, R, S)."""
        if not self.serial_conn or not self.serial_conn.is_open:
            return False
            
        try:
            # Ensure newline for readline() on Arduino side
            full_cmd = f"{cmd}\n" 
            self.serial_conn.write(full_cmd.encode('utf-8'))
            print(f"📤 Sent: {cmd}")
            return True
        except Exception as e:
            print(f"❌ Send Failed: {e}")
            return False

    def set_speed(self, speed):
        """Send speed limit to Gateway (0-100)."""
        if not self.serial_conn or not self.serial_conn.is_open:
            return False
        
        try:
            full_cmd = f"SPEED:{int(speed)}\n"
            self.serial_conn.write(full_cmd.encode('utf-8'))
            print(f"⚡ Set Speed: {speed}%")
            return True
        except Exception as e:
            print(f"❌ Speed Set Failed: {e}")
            return False

    def get_telemetry(self):
        """Return thread-safe telemetry copy."""
        with self.lock:
            return self.telemetry.copy()

    def close(self):
        self.running = False
        if self.serial_conn:
            self.serial_conn.close()
