from datetime import datetime, timezone


def ensure_utc_aware(dt: datetime | None) -> datetime | None:
    """
    Ensures a datetime object is timezone-aware in UTC.
    If naive, converts/replaces it with UTC.
    """
    if dt is None:
        return None
    if not isinstance(dt, datetime):
        return None
    if dt.tzinfo is None or dt.tzinfo.utcoffset(dt) is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def parse_deadline(val) -> datetime | None:
    """
    Safely parses a deadline string (YYYY-MM-DD, ISO 8601, etc.) or datetime,
    ensuring it is always timezone-aware in UTC.
    If a date-only string is passed (e.g. '2026-11-23'), sets time to end-of-day
    23:59:59 UTC so that the deadline remains valid throughout that entire calendar day.
    """
    if not val:
        return None
    if isinstance(val, datetime):
        return ensure_utc_aware(val)

    val_str = str(val).strip()
    if not val_str:
        return None

    # Handle standard ISO formats and 'Z' suffix
    val_str = val_str.replace('Z', '+00:00')
    try:
        # Date only: e.g. "2026-11-23"
        if len(val_str) == 10 and '-' in val_str and 'T' not in val_str and ' ' not in val_str:
            dt = datetime.fromisoformat(val_str)
            return dt.replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)

        dt = datetime.fromisoformat(val_str)
        return ensure_utc_aware(dt)
    except Exception:
        # Fallback formats
        for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y"):
            try:
                dt = datetime.strptime(val_str, fmt)
                if fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y"):
                    return dt.replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
                return dt.replace(tzinfo=timezone.utc)
            except ValueError:
                continue
        raise ValueError(f"Unable to parse deadline '{val_str}'")


def is_past_deadline(deadline_val) -> bool:
    """
    Safely checks whether a deadline is in the past compared to current UTC time.
    Handles naive and aware datetimes safely without throwing offset comparison errors.
    """
    if not deadline_val:
        return False
    aware_dt = ensure_utc_aware(deadline_val)
    if not aware_dt:
        return False
    return datetime.now(timezone.utc) > aware_dt
