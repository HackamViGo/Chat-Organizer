import sys
from pathlib import Path

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 svg_to_icon.py path/to/icon.svg IconName")
        return
    
    svg_path = Path(sys.argv[1])
    name = sys.argv[2]
    
    if not svg_path.exists():
        print(f"❌ SVG file not found: {svg_path}")
        return

    svg_content = svg_path.read_text()
    # Simple conversion logic - wrapping in a React component
    icon_template = f"""import React from 'react';

export const {name}Icon = (props: React.SVGProps<SVGSVGElement>) => (
  {svg_content.replace('<svg', '<svg {...props}')}
);
"""
    
    output_path = Path("packages/ui/src/icons") / f"{name}Icon.tsx"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(icon_template)
    print(f"🎨 Icon '{name}' created in packages/ui/src/icons/")

if __name__ == "__main__":
    main()
