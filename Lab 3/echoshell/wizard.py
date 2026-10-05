from pathlib import Path

BASE_DIR = Path(__file__).parent
CHOICE_FILE = BASE_DIR / "wizard_choice.txt"

MEMORIES = {
    "1": "joy",
    "2": "angry",
    "3": "homesick",
    "4": "nervous",
    "5": "presentation_nervous",
    "6": "overwhelmed",
    "0": "none",
}

while True:
    print()
    print("=" * 40)
    print("     ECHOSHELL WIZARD CONTROLLER")
    print("=" * 40)
    print("1  Joy")
    print("2  Angry")
    print("3  Homesick")
    print("4  Nervous")
    print("5  Presentation nervous")
    print("6  Overwhelmed")
    print("0  No memory")
    print("=" * 40)

    choice = input("Choose memory: ").strip()

    if choice not in MEMORIES:
        print("Please enter 0-6.")
        continue

    memory = MEMORIES[choice]

    CHOICE_FILE.write_text(memory)

    print(f"[WIZARD] Selected: {memory}")
