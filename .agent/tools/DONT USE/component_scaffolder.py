import os
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent.parent
UI_DIR = ROOT / "packages/ui/src/components"

TEMPLATE_TSX = """import React from 'react';
import { cn } from '@brainbox/ui/utils';

interface {name}Props {{
  className?: string;
  children?: React.ReactNode;
}}

export const {name}: React.FC<{name}Props> = ({{ className, children }}) => {{
  return (
    <div className={{cn('p-4 border rounded-lg', className)}}>
      {{children || '{name} Component'}}
    </div>
  );
}};
"""

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 component_scaffolder.py ComponentName")
        return

    name = sys.argv[1]
    target_dir = UI_DIR / name
    
    if target_dir.exists():
        print(f"❌ Component '{name}' already exists!")
        return

    os.makedirs(target_dir)
    
    # Create .tsx
    with open(target_dir / f"{name}.tsx", 'w') as f:
        f.write(TEMPLATE_TSX.format(name=name))
    
    # Create empty index.ts for export
    with open(target_dir / "index.ts", 'w') as f:
        f.write(f"export * from './{name}';\n")
        
    print(f"✨ Component '{name}' printed successfully in packages/ui!")

if __name__ == "__main__":
    main()
