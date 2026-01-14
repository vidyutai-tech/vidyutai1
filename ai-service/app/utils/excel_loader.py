import re
import os
from pathlib import Path

import pandas as pd

# Resolve data file relative to this module to work in containers (Render/Netlify)
BASE_DIR = Path(__file__).resolve().parents[2]  # ai-service/app/utils -> ai-service/
DEFAULT_DATA_FILE = BASE_DIR / "data" / "power_profile_one_month_updated.xlsx"

# Allow override via env var; otherwise use project-relative data file
env_path = os.getenv("POWER_DATA_FILE", "")
candidate_env = Path(env_path) if env_path else None
cwd_candidate = Path.cwd() / "power_profile_one_month_updated.xlsx"

if candidate_env and candidate_env.exists():
    DATA_FILE = candidate_env
elif cwd_candidate.exists():
    DATA_FILE = cwd_candidate
else:
    DATA_FILE = DEFAULT_DATA_FILE


def _normalize_col(col: str) -> str:
    """Lowercase and replace non-alphanumerics with underscores for easier access."""
    return re.sub(r"[^a-z0-9]+", "_", str(col).lower()).strip("_")


def load_sheet(sheet_name: str) -> pd.DataFrame:
    """
    Load a sheet from the Excel file, normalize columns, and return a DataFrame.
    Raises FileNotFoundError if the Excel file is missing so the issue is visible in logs.
    """
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"Excel file not found at {DATA_FILE}")

    df = pd.read_excel(DATA_FILE, sheet_name=sheet_name)
    df.columns = [_normalize_col(c) for c in df.columns]
    return df


# Load once at module import time; fall back to empty frames if anything goes wrong
try:
    RESIDENTIAL_DF = load_sheet("residential_dataset")
    SOLAR_DF = load_sheet("plant_level_data")
except Exception as e:  # noqa: BLE001
    print("❌ Excel loading failed:", e)
    RESIDENTIAL_DF = pd.DataFrame()
    SOLAR_DF = pd.DataFrame()
