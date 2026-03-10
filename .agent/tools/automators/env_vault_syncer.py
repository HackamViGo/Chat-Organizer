import os
from pathlib import Path

ROOT = Path(__file__).parent.parent.parent
ENV_FILE = ROOT / ".env"
EXAMPLE_FILE = ROOT / ".env.example"

def get_keys(path):
    if not path.exists(): return set()
    keys = set()
    with open(path, 'r') as f:
        for line in f:
            if '=' in line and not line.strip().startswith('#'):
                keys.add(line.split('=')[0].strip())
    return keys

def main():
    print("🔒 SYNCING ENV VAULT...")
    current_keys = get_keys(ENV_FILE)
    example_keys = get_keys(EXAMPLE_FILE)
    
    missing_in_example = current_keys - example_keys
    
    if missing_in_example:
        print(f"⚠️ Found {len(missing_in_example)} keys missing in .env.example")
        with open(EXAMPLE_FILE, 'a') as f:
            f.write("\n# Added by Vault Syncer\n")
            for key in missing_in_example:
                f.write(f"{key}=your_placeholder_here\n")
                print(f"  + Added {key} to .env.example")
        print("✅ .env.example is now up to date.")
    else:
        print("✅ Vault is perfectly synced.")

if __name__ == "__main__":
    main()
