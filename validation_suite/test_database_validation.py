import pytest
from pipeline import fetch_all_companies, transform_company, validate_record

# Fetch companies at the module level for parametrization
try:
    COMPANIES = fetch_all_companies()
except Exception as e:
    COMPANIES = []
    print(f"Error fetching companies for tests: {e}")

@pytest.mark.parametrize("company_row", COMPANIES, ids=lambda x: x.get('name', 'Unknown'))
def test_supabase_company_data(company_row):
    """
    Test individual company records from Supabase against the full validation suite.
    """
    # Stage 2: Transform
    record = transform_company(company_row)
    
    # Stage 3: Validate
    result = validate_record(record)
    
    # Assert that the record passes all checks
    # If it fails, the error message will show which checks failed
    if result["status"] == "FAIL":
        failed_checks = [c["field"] + ": " + c["message"] for c in result["details"] if not c["valid"]]
        pytest.fail(f"Validation FAILED for {result['company_name']}.\nFailed checks: {failed_checks}")
    
    assert result["status"] == "PASS"
