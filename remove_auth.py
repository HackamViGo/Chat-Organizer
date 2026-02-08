import json
import os

path = os.path.expanduser("~/.openclaw/openclaw.json")
try:
    with open(path, 'r') as f:
        data = json.load(f)

    # Remove the specific OAuth profile
    if 'auth' in data and 'profiles' in data['auth']:
        key_to_remove = 'google-antigravity:hackamvigopaypal@gmail.com'
        if key_to_remove in data['auth']['profiles']:
            del data['auth']['profiles'][key_to_remove]
            print(f"Removed profile: {key_to_remove}")
        else:
            print(f"Profile {key_to_remove} not found.")

    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
    print("Successfully updated openclaw.json")

except Exception as e:
    print(f"Error: {e}")
