from app.services.cv_parser import parse_with_heuristics

def test_heuristic_parser():
    """Verify that the regular expressions and keyword scanners parse typical resume details correctly."""
    sample_text = """
    Jane Smith
    Senior QA Engineer
    Email: jane.smith@example.com
    Phone: 555-123-4567
    Location: Colombo, Sri Lanka
    
    Summary
    Accomplished QA engineer with over 6 years of experience in manual and automation testing.
    
    Skills
    Python, Java, Selenium, QA, Manual Testing, Git
    """
    
    result = parse_with_heuristics(sample_text)
    
    # Assert contact extraction
    assert result["full_name"] == "Jane Smith"
    assert result["email"] == "jane.smith@example.com"
    assert result["phone"] == "555-123-4567"
    assert result["location"] == "Colombo, Sri Lanka"
    
    # Assert skill matching
    assert "Python" in result["skills"]
    assert "QA" in result["skills"]
    assert "Selenium" in result["skills"]
    assert "Java" in result["skills"]
    
    # Assert specialty summary extraction
    assert "Accomplished QA engineer" in result["specialty_summary"]

def test_heuristic_parser_refinements():
    """Verify year ranges are not matched as phone numbers, and name/location are formatted nicely."""
    sample_text = """
    AMNA SIDDIQUE
    Email: amnasiddique2004@gmail.com
    Phone: 2022-2023
    Location: Kandy, Sri lankaObjective
    
    Education
    Business studies student.
    """
    result = parse_with_heuristics(sample_text)
    
    # Assert year-like phone is ignored/not extracted, and name/location are cleaned
    assert result["full_name"] == "Amna Siddique"
    assert result["location"] == "Kandy, Sri Lanka"
    assert result["phone"] is None or result["phone"] != "2022-2023"
