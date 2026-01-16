
import os
import re

PROJECT_DIR = '/Users/ngotrung/Rescue-Rover/Rescue_Rover_Report'
# Commands where the ARGUMENT should be protected (filenames, labels, keys)
PROTECTED_COMMANDS = {
    'label', 'ref', 'cref', 'Cref', 'cite', 'citep', 'citet', 
    'input', 'include', 'url', 'href', 'usepackage', 
    'bibliographystyle', 'bibliography', 'pgfplotsset', 'hypersetup',
    'graphicspath', 'includegraphics'
}

def process_file(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()

    new_lines = []
    has_changes = False
    
    for line in lines:
        # Skip comment lines
        if line.strip().startswith('%'):
            new_lines.append(line)
            continue
            
        # 1. Protect commands
        protected_chunks = []
        
        def protect_match(match):
            protected_chunks.append(match.group(0))
            return f"__PROTECTED_{len(protected_chunks)-1}__"

        # Regex for \cmd{content} or \cmd[opt]{content}
        # Captures command and its arguments to protect them
        cmd_pattern = r'\\(' + '|'.join(PROTECTED_COMMANDS) + r')(\[[^\]]*\])?\{[^\}]+\}'
        
        temp_line = re.sub(cmd_pattern, protect_match, line)
        
        # 2. Perform replacement
        # "real-time" -> "real time", "3D-printed" -> "3D printed"
        def replace_hyphen(match):
            return f"{match.group(1)} {match.group(2)}"

        # Updated pattern: Alphanumeric-Alphanumeric
        # e.g., "3D-printed", "ESP32-S3", "real-time"
        pattern = r'\b([a-zA-Z0-9]+)-([a-zA-Z0-9]+)\b'
        
        prev_line = ""
        current_line = temp_line
        
        # Iterative replacement to handle multi-hyphen words like state-of-the-art
        loop_limit = 0
        while current_line != prev_line and loop_limit < 5:
            prev_line = current_line
            current_line = re.sub(pattern, replace_hyphen, current_line)
            loop_limit += 1

        # 3. Restore protected chunks
        for i, chunk in enumerate(protected_chunks):
            current_line = current_line.replace(f"__PROTECTED_{i}__", chunk)
        
        if current_line != line:
            has_changes = True
            
        new_lines.append(current_line)

    if has_changes:
        print(f"Modifying {filepath}")
        with open(filepath, 'w') as f:
            f.writelines(new_lines)

for root, dirs, files in os.walk(PROJECT_DIR):
    for file in files:
        if file.endswith(".tex"):
            process_file(os.path.join(root, file))
