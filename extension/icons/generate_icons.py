"""
Generate Sentinel AI extension icons in multiple sizes
"""
from PIL import Image, ImageDraw
import os

def create_sentinel_icon(size):
    """Create a Sentinel AI icon with the specified size"""
    # Create image with gradient background
    img = Image.new('RGB', (size, size), color='white')
    draw = ImageDraw.Draw(img)
    
    # Draw gradient background (purple gradient)
    for y in range(size):
        # Gradient from #667eea to #764ba2
        r = int(102 + (118 - 102) * y / size)
        g = int(126 + (75 - 126) * y / size)
        b = int(234 + (162 - 234) * y / size)
        draw.line([(0, y), (size, y)], fill=(r, g, b))
    
    # Calculate proportions
    center_x = size // 2
    center_y = size // 2
    eye_width = int(size * 0.5)
    eye_height = int(size * 0.3)
    pupil_radius = int(size * 0.08)
    
    # Draw eye (white ellipse)
    eye_bbox = [
        center_x - eye_width // 2,
        center_y - eye_height // 2,
        center_x + eye_width // 2,
        center_y + eye_height // 2
    ]
    draw.ellipse(eye_bbox, fill='white')
    
    # Draw pupil (gradient purple)
    pupil_bbox = [
        center_x - pupil_radius,
        center_y - pupil_radius,
        center_x + pupil_radius,
        center_y + pupil_radius
    ]
    draw.ellipse(pupil_bbox, fill='#667eea')
    
    # Draw inner pupil
    inner_pupil_radius = pupil_radius // 2
    inner_pupil_bbox = [
        center_x - inner_pupil_radius,
        center_y - inner_pupil_radius,
        center_x + inner_pupil_radius,
        center_y + inner_pupil_radius
    ]
    draw.ellipse(inner_pupil_bbox, fill='#764ba2')
    
    # Add circuit lines for larger icons
    if size >= 48:
        line_width = max(1, size // 50)
        circuit_color = 'rgba(255, 255, 255, 0.6)'
        
        # Convert rgba to rgb for PIL
        circuit_rgb = (255, 255, 255)
        
        # Top circuit lines
        offset_x = eye_width // 3
        offset_y = int(size * 0.15)
        
        # Left top circuit
        draw.line([
            (center_x - offset_x, center_y - eye_height // 2),
            (center_x - offset_x, center_y - eye_height // 2 - offset_y)
        ], fill=circuit_rgb, width=line_width)
        
        draw.line([
            (center_x - offset_x, center_y - eye_height // 2 - offset_y),
            (center_x, center_y - eye_height // 2 - offset_y)
        ], fill=circuit_rgb, width=line_width)
        
        # Right top circuit
        draw.line([
            (center_x + offset_x, center_y - eye_height // 2),
            (center_x + offset_x, center_y - eye_height // 2 - offset_y)
        ], fill=circuit_rgb, width=line_width)
        
        draw.line([
            (center_x + offset_x, center_y - eye_height // 2 - offset_y),
            (center_x, center_y - eye_height // 2 - offset_y)
        ], fill=circuit_rgb, width=line_width)
        
        # Bottom circuit lines
        # Left bottom circuit
        draw.line([
            (center_x - offset_x, center_y + eye_height // 2),
            (center_x - offset_x, center_y + eye_height // 2 + offset_y)
        ], fill=circuit_rgb, width=line_width)
        
        draw.line([
            (center_x - offset_x, center_y + eye_height // 2 + offset_y),
            (center_x, center_y + eye_height // 2 + offset_y)
        ], fill=circuit_rgb, width=line_width)
        
        # Right bottom circuit
        draw.line([
            (center_x + offset_x, center_y + eye_height // 2),
            (center_x + offset_x, center_y + eye_height // 2 + offset_y)
        ], fill=circuit_rgb, width=line_width)
        
        draw.line([
            (center_x + offset_x, center_y + eye_height // 2 + offset_y),
            (center_x, center_y + eye_height // 2 + offset_y)
        ], fill=circuit_rgb, width=line_width)
        
        # Draw circuit nodes
        node_radius = max(2, size // 50)
        nodes = [
            (center_x - offset_x, center_y - eye_height // 2 - offset_y),
            (center_x + offset_x, center_y - eye_height // 2 - offset_y),
            (center_x, center_y - eye_height // 2 - offset_y),
            (center_x - offset_x, center_y + eye_height // 2 + offset_y),
            (center_x + offset_x, center_y + eye_height // 2 + offset_y),
            (center_x, center_y + eye_height // 2 + offset_y),
        ]
        
        for x, y in nodes:
            node_bbox = [x - node_radius, y - node_radius, x + node_radius, y + node_radius]
            draw.ellipse(node_bbox, fill=circuit_rgb)
    
    return img

def main():
    """Generate icons in standard sizes"""
    sizes = [16, 48, 128]
    
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    print("🛡️ Generating Sentinel AI Extension Icons...")
    print("-" * 50)
    
    for size in sizes:
        icon = create_sentinel_icon(size)
        filename = f"icon{size}.png"
        filepath = os.path.join(script_dir, filename)
        icon.save(filepath, 'PNG')
        print(f"✓ Created {filename} ({size}x{size})")
    
    print("-" * 50)
    print("✨ All icons generated successfully!")
    print(f"\nIcons saved to: {script_dir}")
    print("\nNext steps:")
    print("1. Update your manifest.json to include these icons")
    print("2. Add the following to your manifest.json:")
    print('''
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
''')

if __name__ == "__main__":
    main()
