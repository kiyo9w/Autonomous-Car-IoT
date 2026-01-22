# test_ai_module.py - Unit Tests for AI Module
"""
Unit tests for the AI autonomous module.
Run with: python -m pytest test_ai_module.py -v
"""

import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


class TestCommandArbiter:
    """Tests for CommandArbiter priority logic"""
    
    def test_priority_order(self):
        """Test that higher priority commands override lower ones"""
        from ai.command_arbiter import CommandArbiter, CommandPriority, RoverCommand
        
        received_commands = []
        def callback(cmd):
            received_commands.append(cmd)
        
        arbiter = CommandArbiter(command_callback=callback)
        
        # Submit low priority command
        manual_cmd = RoverCommand.forward(CommandPriority.MANUAL, "user", 0.5)
        arbiter.submit(manual_cmd)
        
        assert len(received_commands) == 1
        assert received_commands[-1].priority == CommandPriority.MANUAL
        
        # Submit higher priority tactical stop
        tactical_cmd = RoverCommand.stop(CommandPriority.TACTICAL, "YOLO", "Person detected")
        arbiter.submit(tactical_cmd)
        
        assert len(received_commands) == 2
        assert received_commands[-1].priority == CommandPriority.TACTICAL
    
    def test_clear_priority(self):
        """Test clearing a priority level"""
        from ai.command_arbiter import CommandArbiter, CommandPriority, RoverCommand
        
        arbiter = CommandArbiter()
        
        # Submit commands at different priorities
        arbiter.submit(RoverCommand.forward(CommandPriority.MANUAL, "user"))
        arbiter.submit(RoverCommand.stop(CommandPriority.TACTICAL, "YOLO"))
        
        # Clear tactical
        arbiter.clear(CommandPriority.TACTICAL)
        
        # Current command should now be manual
        current = arbiter.get_current_command()
        # Note: The arbiter only re-evaluates on submit, so this tests internal state
    
    def test_status_reporting(self):
        """Test status reporting"""
        from ai.command_arbiter import CommandArbiter, CommandPriority, RoverCommand
        
        arbiter = CommandArbiter()
        
        status = arbiter.get_status()
        assert 'enabled' in status
        assert status['enabled'] == True
        
        arbiter.disable()
        status = arbiter.get_status()
        assert status['enabled'] == False


class TestRoverCommand:
    """Tests for RoverCommand creation"""
    
    def test_stop_command(self):
        """Test stop command creation"""
        from ai.command_arbiter import CommandPriority, RoverCommand
        
        cmd = RoverCommand.stop(CommandPriority.SAFETY, "test", "Emergency")
        
        assert cmd.x == 2048
        assert cmd.y == 2048
        assert cmd.priority == CommandPriority.SAFETY
        assert cmd.source == "test"
    
    def test_forward_command(self):
        """Test forward command creation"""
        from ai.command_arbiter import CommandPriority, RoverCommand
        
        cmd = RoverCommand.forward(CommandPriority.STRATEGIC, "VLM", 0.5)
        
        assert cmd.x == 2048  # Centered
        assert cmd.y > 2048  # Forward
        assert cmd.priority == CommandPriority.STRATEGIC
    
    def test_steer_command(self):
        """Test steering command creation"""
        from ai.command_arbiter import CommandPriority, RoverCommand
        
        left_cmd = RoverCommand.steer(CommandPriority.STRATEGIC, "VLM", "left")
        assert left_cmd.x < 2048
        
        right_cmd = RoverCommand.steer(CommandPriority.STRATEGIC, "VLM", "right")
        assert right_cmd.x > 2048
        
        center_cmd = RoverCommand.steer(CommandPriority.STRATEGIC, "VLM", "center")
        assert center_cmd.x == 2048


class TestFramePreprocessor:
    """Tests for FramePreprocessor"""
    
    def test_target_size(self):
        """Test default target size"""
        from ai.frame_preprocessor import FramePreprocessor
        
        preprocessor = FramePreprocessor()
        assert preprocessor.target_size == (320, 240)
    
    def test_custom_size(self):
        """Test custom target size"""
        from ai.frame_preprocessor import FramePreprocessor
        
        preprocessor = FramePreprocessor(target_size=(640, 480))
        assert preprocessor.target_size == (640, 480)
    
    def test_invalid_jpeg_handling(self):
        """Test handling of invalid JPEG data"""
        from ai.frame_preprocessor import FramePreprocessor
        
        preprocessor = FramePreprocessor()
        
        # None input
        assert preprocessor.jpeg_to_pil(None) is None
        
        # Invalid bytes
        assert preprocessor.jpeg_to_pil(b"not a jpeg") is None
        
        # Empty bytes
        assert preprocessor.jpeg_to_pil(b"") is None


class TestConfig:
    """Tests for AI configuration"""
    
    def test_default_config(self):
        """Test default configuration values"""
        from ai.config import AIConfig, DEFAULT_CONFIG
        
        assert DEFAULT_CONFIG.yolo_confidence == 0.5
        assert DEFAULT_CONFIG.vlm_cooldown_seconds == 2.0
        assert DEFAULT_CONFIG.input_width == 320
        assert DEFAULT_CONFIG.input_height == 240
    
    def test_custom_config(self):
        """Test custom configuration"""
        from ai.config import AIConfig
        
        config = AIConfig(yolo_confidence=0.7, vlm_cooldown_seconds=3.0)
        
        assert config.yolo_confidence == 0.7
        assert config.vlm_cooldown_seconds == 3.0


class TestEnums:
    """Tests for configuration enums"""
    
    def test_steering_commands(self):
        """Test steering command enum"""
        from ai.config import SteeringCommand
        
        assert SteeringCommand.LEFT.value == "left"
        assert SteeringCommand.RIGHT.value == "right"
        assert SteeringCommand.CENTER.value == "center"
        assert SteeringCommand.STOP.value == "stop"
    
    def test_navigation_goals(self):
        """Test navigation goal enum"""
        from ai.config import NavigationGoal
        
        assert NavigationGoal.OPEN_SPACE.value == "open_space"
        assert NavigationGoal.FOLLOW_PATH.value == "follow_path"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
