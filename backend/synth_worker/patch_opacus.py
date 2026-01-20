#!/usr/bin/env python3
"""Patch Opacus to work with torch 2.2.2 (RMSNorm doesn't exist in torch <2.3)"""
import os
import sys
import site

# Find opacus installation path
opacus_path = None
for site_pkg in site.getsitepackages() + ['/usr/local/lib/python3.11/site-packages', '/usr/lib/python3/dist-packages']:
    test_path = os.path.join(site_pkg, 'opacus')
    if os.path.exists(test_path):
        opacus_path = test_path
        break

if not opacus_path:
    print("ERROR: Could not find opacus installation", file=sys.stderr)
    sys.exit(1)

# Patch rms_norm.py
rms_norm_path = os.path.join(opacus_path, 'grad_sample', 'rms_norm.py')
try:
    with open(rms_norm_path, 'r') as f:
        lines = f.readlines()
    
    # Check if already patched
    content_str = ''.join(lines)
    if 'if hasattr(nn, "RMSNorm"):' in content_str:
        print('⚠️  rms_norm.py already patched')
    else:
        # Find the decorator line
        decorator_idx = None
        for i, line in enumerate(lines):
            if '@register_grad_sampler(nn.RMSNorm)' in line:
                decorator_idx = i
                break
        
        if decorator_idx is None:
            print('⚠️  Could not find RMSNorm decorator in rms_norm.py')
        else:
            base_indent = len(lines[decorator_idx]) - len(lines[decorator_idx].lstrip())
            
            # Find where the function ends
            # Look for next def at same or less indent, or end of file
            func_end_idx = len(lines)
            for i in range(decorator_idx + 1, len(lines)):
                line = lines[i]
                if line.strip() and not line.strip().startswith('#'):
                    line_indent = len(line) - len(line.lstrip())
                    # Check if this is a new function definition at same or less indent
                    if line_indent <= base_indent and 'def ' in line and 'compute_rms_norm' not in line:
                        func_end_idx = i
                        break
            
            # Build new lines
            new_lines = lines[:decorator_idx]
            # Add if statement
            new_lines.append(' ' * base_indent + 'if hasattr(nn, "RMSNorm"):\n')
            
            # Indent all lines from decorator to function end
            for i in range(decorator_idx, func_end_idx):
                line = lines[i]
                if line.strip():
                    # Preserve relative indentation but add base_indent + 4
                    original_indent = len(line) - len(line.lstrip())
                    # Calculate relative indent from decorator's indent
                    if i == decorator_idx:
                        # Decorator line - indent it
                        new_lines.append(' ' * (base_indent + 4) + line.lstrip())
                    else:
                        # Other lines - preserve their relative indent from decorator
                        # If line was at base_indent level, make it base_indent + 4
                        # If line was indented more, add 4 to its indent
                        if original_indent <= base_indent:
                            new_indent = base_indent + 4
                        else:
                            new_indent = original_indent + 4
                        new_lines.append(' ' * new_indent + line.lstrip())
                else:
                    # Empty line
                    new_lines.append('\n')
            
            # Add remaining lines
            new_lines.extend(lines[func_end_idx:])
            
            # Write back
            with open(rms_norm_path, 'w') as f:
                f.writelines(new_lines)
            print('✅ Patched rms_norm.py')
except Exception as e:
    print(f"ERROR patching rms_norm.py: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Patch __init__.py
init_path = os.path.join(opacus_path, 'grad_sample', '__init__.py')
try:
    with open(init_path, 'r') as f:
        content = f.read()
    
    if 'from .rms_norm import compute_rms_norm_grad_sample' in content:
        if 'try:' not in content.split('from .rms_norm import')[0][-100:]:
            lines = content.split('\n')
            new_lines = []
            for i, line in enumerate(lines):
                if 'from .rms_norm import compute_rms_norm_grad_sample' in line:
                    indent = len(line) - len(line.lstrip())
                    new_lines.append(' ' * indent + 'try:')
                    import_line = line.lstrip().replace('  # noqa', '').replace(' # noqa', '').strip()
                    new_lines.append(' ' * (indent + 4) + import_line + '  # noqa')
                    new_lines.append(' ' * indent + 'except (ImportError, AttributeError):')
                    new_lines.append(' ' * (indent + 4) + 'pass')
                else:
                    new_lines.append(line)
            content = '\n'.join(new_lines)
            with open(init_path, 'w') as f:
                f.write(content)
            print('✅ Patched __init__.py')
        else:
            print('⚠️  __init__.py already patched')
    else:
        print('⚠️  Could not find rms_norm import in __init__.py')
except Exception as e:
    print(f"ERROR patching __init__.py: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)

print('✅ Opacus patching complete')
