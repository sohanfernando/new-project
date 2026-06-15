from app.services.cv_parser import get_heuristic_twin_fallback, generate_digital_twin_only
from app.schemas.digital_twin import DigitalTwinOut
from datetime import datetime

def test_heuristic_twin_fallback():
    skills = ["Python", "FastAPI", "React"]
    twin = get_heuristic_twin_fallback(skills, target_role="Backend Developer", target_level="Mid-Level")
    
    assert twin["predicted_level"] == "Mid-Level"
    assert twin["level_confidence"] == 75.0
    assert "Backend Developer" in twin["predicted_roles"]
    assert len(twin["strengths_analysis"]) >= 2
    assert len(twin["hidden_skills"]) >= 2
    assert twin["growth_potential"] == "Medium"
    assert "recommended_paths" in twin
    assert "technical" in twin["interview_questions"]
    assert "scenario" in twin["interview_questions"]
    assert "behavioral" in twin["interview_questions"]

def test_generate_digital_twin_only_fallback():
    cv_text = "Experienced software developer using Python and SQL. Passionate about AI."
    twin = generate_digital_twin_only(cv_text, target_role="Software Engineer", target_level="Senior")
    
    assert twin["predicted_level"] == "Senior"
    assert "Software Engineer" in twin["predicted_roles"]
    assert twin["growth_potential"] == "Medium"
    assert "Python" in twin["strengths_analysis"][0]["title"] or "SQL" in twin["strengths_analysis"][0]["title"] or "Software Engineering" in twin["strengths_analysis"][0]["title"]
