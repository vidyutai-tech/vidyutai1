import re
from pathlib import Path

import pandas as pd

# Absolute path as provided
DATA_FILE = Path("/Users/himasoni_123/Documents/IITGN/vidyutai1/ai-service/data/power_profile_one_month_updated.xlsx")


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
