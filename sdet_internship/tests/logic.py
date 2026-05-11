import csv
import pytest
from datetime import datetime

def load_test_data(file_path):
    """
    Utility to load CSV test data into a list of dictionaries.
    """
    import os
    from pathlib import Path
    
    # Resolve path relative to sdet_internship directory
    # logic.py is in sdet_internship/tests/
    base_dir = Path(__file__).parent.parent
    
    potential_path = base_dir / file_path
    if potential_path.exists():
        file_path = potential_path
    else:
        # Check in sdet_internship/data/
        alt_path = base_dir / "data" / os.path.basename(file_path)
        if alt_path.exists():
            file_path = alt_path
            
    with open(file_path, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))

def not_null(value):
    return value is not None and str(value).strip() != ""

def valid_string(value, min_len=2, max_len=1000):
    if value is None:
        return False
    value = str(value).strip()
    return min_len <= len(value) <= max_len

def valid_number(value):
    try:
        float(value)
        return True
    except:
        return False

def valid_date(value):
    try:
        datetime.strptime(value, "%Y-%m-%d")
        return True
    except:
        return False

def valid_url(value):
    return value is not None and ("http://" in value or "https://" in value or "www." in value)

def valid_email(value):
    return value is not None and "@" in value and "." in value

def valid_boolean(value):
    return str(value).lower() in ["true", "false"]

def no_invalid_keywords(value):
    if value is None:
        return False
    bad_words = ["test", "dummy", "lorem", "na", "null", "sample"]
    return not any(word in value.lower() for word in bad_words)
