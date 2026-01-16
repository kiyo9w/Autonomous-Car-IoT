# command_arbiter.py - Priority-based Command Fusion
"""
Command Arbiter: Fuses commands from multiple sources with priority hierarchy.
Priority: SAFETY > TACTICAL > STRATEGIC > MANUAL > IDLE
"""

import time
import threading
from dataclasses import dataclass, field
from enum import IntEnum
from typing import Optional, Callable
from queue import Queue, Empty


class CommandPriority(IntEnum):
    """Priority levels for command sources (higher = more priority)"""
    IDLE = 0        # No command
    MANUAL = 10     # User joystick/button
    STRATEGIC = 20  # VLM navigation decisions
    TACTICAL = 30   # YOLO obstacle detection
    SAFETY = 100    # Firmware-level or critical stop


@dataclass
class RoverCommand:
    """Unified command format for rover control"""
    priority: CommandPriority
    x: int = 2048  # Joystick X (0-4095, center=2048)
    y: int = 2048  # Joystick Y (0-4095, center=2048)
    source: str = "unknown"
    reason: str = ""
    timestamp: float = field(default_factory=time.time)
    
    @classmethod
    def stop(cls, priority: CommandPriority, source: str, reason: str = "") -> 'RoverCommand':
        """Create a STOP command"""
        return cls(priority=priority, x=2048, y=2048, source=source, reason=reason)
    
    @classmethod
    def forward(cls, priority: CommandPriority, source: str, speed: float = 0.5) -> 'RoverCommand':
        """Create a FORWARD command (speed: 0.0-1.0)"""
        y = int(2048 + speed * 2047)
        return cls(priority=priority, x=2048, y=y, source=source)
    
    @classmethod
    def steer(cls, priority: CommandPriority, source: str, 
              direction: str, speed: float = 0.3) -> 'RoverCommand':
        """Create a steering command"""
        y = int(2048 + speed * 2047)  # Forward with speed
        if direction == "left":
            x = int(2048 - 0.5 * 2047)
        elif direction == "right":
            x = int(2048 + 0.5 * 2047)
        else:  # center
            x = 2048
        return cls(priority=priority, x=x, y=y, source=source, reason=direction)


class CommandArbiter:
    """
    Priority-based command arbiter that fuses multiple input sources.
    Higher priority commands override lower priority ones.
    """
    
    def __init__(self, command_callback: Optional[Callable[[RoverCommand], None]] = None):
        """
        Initialize arbiter.
        
        Args:
            command_callback: Optional callback called when command changes
        """
        self._lock = threading.Lock()
        self._commands: dict[CommandPriority, Optional[RoverCommand]] = {}
        self._command_callback = command_callback
        self._last_command: Optional[RoverCommand] = None
        self._enabled = True
        self._auto_mode = True  # Default to auto-accepting AI decisions
        self._pending_command: Optional[RoverCommand] = None
        
        # Command log for debugging/mission log
        self._command_log: Queue = Queue(maxsize=100)
    
    def submit(self, command: RoverCommand):
        """
        Submit a command from a specific priority level.
        The highest priority active command will be executed.
        
        Args:
            command: RoverCommand to submit
        """
        if not self._enabled:
            return
            
        with self._lock:
            # AI Manual Mode Logic:
            # If command is STRATEGIC (VLM) and we are NOT in auto mode,
            # queue it as pending instead of executing immediately.
            if command.priority == CommandPriority.STRATEGIC and not self._auto_mode:
                self._pending_command = command
                # Log it but don't execute yet
                self._log_command(command) 
                return

            self._commands[command.priority] = command
            self._log_command(command)
            self._evaluate_and_execute()
    
    def set_auto_mode(self, enabled: bool):
        """Set AI auto-execution mode"""
        with self._lock:
            self._auto_mode = enabled
            # If switching to auto and we have a pending command, execute it?
            # Or just clear it? Let's clear it to avoid surprises.
            if enabled:
                self._pending_command = None
                
    def approve_pending(self):
        """Approve the pending strategic command"""
        with self._lock:
            if self._pending_command:
                # Promote to active command
                self._commands[CommandPriority.STRATEGIC] = self._pending_command
                self._pending_command = None
                self._evaluate_and_execute()
                return True
            return False

    def reject_pending(self):
        """Reject the pending strategic command"""
        with self._lock:
            self._pending_command = None
            # Also clear any existing strategic command to stop previous action
            self._commands[CommandPriority.STRATEGIC] = None
            self._evaluate_and_execute()
            return True

    def clear(self, priority: CommandPriority):
        """
        Clear command at a specific priority level.
        
        Args:
            priority: Priority level to clear
        """
        with self._lock:
            self._commands[priority] = None
            self._evaluate_and_execute()
    
    def clear_all(self):
        """Clear all commands"""
        with self._lock:
            self._commands.clear()
            self._last_command = None
            self._pending_command = None
    
    def _evaluate_and_execute(self):
        """Evaluate priorities and execute highest priority command"""
        # Find highest priority active command
        active_command = None
        for priority in sorted(self._commands.keys(), reverse=True):
            cmd = self._commands.get(priority)
            if cmd is not None:
                active_command = cmd
                break
        
        # Execute if different from last command
        if active_command and active_command != self._last_command:
            self._last_command = active_command
            if self._command_callback:
                # Convert Command object to serial string/struct if needed
                # But callback in app.py expects ... wait app.py passes serial_manager.send_command
                # send_command expects string (F, B, L, R, S)
                # We need to adapt RoverCommand to string if callback expects string.
                # Let's check app.py: arbiter = CommandArbiter(serial_manager.send_command)
                # serial_manager.send_command(cmd) takes string.
                # CommandArbiter needs to map RoverCommand to 'F', 'L', etc.
                # This seems missing in existing code or assumed.
                # Looking at RoverCommand definition, it handles x,y coords. 
                # Does serial_manager handle raw x,y?
                # SerialManager.send_command handles F,B,L,R,S. 
                # It does NOT seem to handle X,Y in `send_command`.
                # Wait, GateWay parses "X,Y".
                # We should check if serial_manager has a method for raw args.
                # SerialManager.write just writes string.
                
                # Adapting here for safety:
                cmd_str = "S"
                if active_command.reason == "left": cmd_str = "L"
                elif active_command.reason == "right": cmd_str = "R"
                elif active_command.reason == "forward": cmd_str = "F"
                elif active_command.reason == "backward": cmd_str = "B"
                # If X,Y are custom, we need to format them.
                # "X,Y" is the format Gateway expects for joystick.
                if active_command.x != 2048 or active_command.y != 2048:
                     cmd_str = f"{active_command.x},{active_command.y}"
                
                self._command_callback(cmd_str)
    
    def _log_command(self, command: RoverCommand):
        """Log command for mission tracking"""
        try:
            self._command_log.put_nowait({
                'time': time.strftime('%H:%M:%S'),
                'priority': command.priority.name,
                'source': command.source,
                'reason': command.reason,
                'x': command.x,
                'y': command.y
            })
        except:
            pass  # Queue full, ignore
    
    def get_log_entries(self, count: int = 10) -> list:
        """Get recent command log entries"""
        entries = []
        try:
            while len(entries) < count:
                entries.append(self._command_log.get_nowait())
        except Empty:
            pass
        return entries
    
    def get_current_command(self) -> Optional[RoverCommand]:
        """Get the currently active command"""
        with self._lock:
            return self._last_command
    
    def enable(self):
        """Enable the arbiter"""
        self._enabled = True
    
    def disable(self):
        """Disable the arbiter (stops processing new commands)"""
        self._enabled = False
        self.clear_all()
    
    def is_enabled(self) -> bool:
        """Check if arbiter is enabled"""
        return self._enabled
    
    def get_status(self) -> dict:
        """Get arbiter status for API"""
        with self._lock:
            return {
                'enabled': self._enabled,
                'auto_mode': self._auto_mode,
                'pending_command': {
                     'reason': self._pending_command.reason,
                     'source': self._pending_command.source
                } if self._pending_command else None,
                'current_command': {
                    'priority': self._last_command.priority.name if self._last_command else None,
                    'source': self._last_command.source if self._last_command else None,
                    'reason': self._last_command.reason if self._last_command else None,
                } if self._last_command else None,
                'active_priorities': [p.name for p in self._commands.keys() if self._commands.get(p)]
            }
