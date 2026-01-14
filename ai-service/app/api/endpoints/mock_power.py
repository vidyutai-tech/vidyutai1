from fastapi import APIRouter, Query

from app.utils.excel_loader import RESIDENTIAL_DF, SOLAR_DF
from app.utils.power_mapper import slice_hours, remap_time

router = APIRouter(prefix="/api/v1/mock/power", tags=["Mock Power"])


def hours_from_range(r: str) -> int:
    if r in {"24h", "yesterday"}:
        return 24
    if r == "7d":
        return 7 * 24
    return 30 * 24


@router.get("/residential")
def residential(range: str = Query("7d", description="24h | 7d | 30d")):
    hours = hours_from_range(range)
    df = slice_hours(RESIDENTIAL_DF, hours)
    data = remap_time(df)
    return data


@router.get("/solar")
def solar(range: str = Query("7d", description="24h | 7d | 30d")):
    hours = hours_from_range(range)
    df = slice_hours(SOLAR_DF, hours)
    data = remap_time(df)
    return data
