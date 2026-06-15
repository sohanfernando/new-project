import re
import os
import json
import io
import pypdf
import docx2txt
import google.generativeai as genai
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from app.config import GEMINI_API_KEY

class StrengthAnalysis(BaseModel):
    title: str
    rationale: str

class HiddenSkill(BaseModel):
    skill: str
    reasoning: str

class InterviewQuestions(BaseModel):
    technical: List[str] = []
    scenario: List[str] = []
    behavioral: List[str] = []

class CVExtractionSchema(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    skills: List[str] = []
    specialty_summary: Optional[str] = None
    suitability_suggestion: Optional[str] = None
    
    # Digital Twin Fields
    predicted_level: Optional[str] = None
    level_confidence: Optional[float] = None
    predicted_roles: List[str] = []
    strengths_analysis: List[StrengthAnalysis] = []
    hidden_skills: List[HiddenSkill] = []
    growth_potential: Optional[str] = None
    growth_reasoning: Optional[str] = None
    recommended_paths: List[str] = []
    interview_questions: Optional[InterviewQuestions] = None

class DigitalTwinSchema(BaseModel):
    predicted_level: str
    level_confidence: float
    predicted_roles: List[str]
    strengths_analysis: List[StrengthAnalysis]
    hidden_skills: List[HiddenSkill]
    growth_potential: str
    growth_reasoning: str
    recommended_paths: List[str]
    interview_questions: InterviewQuestions

def to_gemini_schema(schema_dict: dict) -> dict:
    cleaned = {}
    if "anyOf" in schema_dict:
        sub_schemas = schema_dict["anyOf"]
        non_null_schema = None
        is_nullable = False
        for sub in sub_schemas:
            if sub.get("type") == "null":
                is_nullable = True
            else:
                non_null_schema = sub
        if non_null_schema:
            schema_dict = {**schema_dict, **non_null_schema}
            schema_dict["nullable"] = is_nullable

    allowed_keys = ["type", "format", "description", "nullable", "items", "enum", "properties", "required"]
    for k in allowed_keys:
        if k in schema_dict:
            cleaned[k] = schema_dict[k]
            
    if "properties" in cleaned and isinstance(cleaned["properties"], dict):
        cleaned["properties"] = {
            prop_name: to_gemini_schema(prop_val)
            for prop_name, prop_val in cleaned["properties"].items()
        }
    if "items" in cleaned and isinstance(cleaned["items"], dict):
        cleaned["items"] = to_gemini_schema(cleaned["items"])
    return cleaned

def clean_name(name: str) -> str:
    if not name:
        return ""
    name = name.title().strip()
    name = re.sub(r"[^\w\s\-\.]", "", name)
    name = re.sub(r"\s+", " ", name)
    return name.strip()

def clean_location(loc: str) -> str:
    if not loc:
        return "Not Specified"
    loc = loc.title().strip()
    loc = loc.replace("Sri Lanka", "Sri Lanka")
    loc = loc.replace("Sri lanka", "Sri Lanka")
    for acronym in ["Uk", "Usa", "Uae", "Us"]:
        loc = re.sub(rf"\b{acronym}\b", acronym.upper(), loc)
    loc = re.sub(r",\s*,", ",", loc)
    loc = re.sub(r"\s+", " ", loc)
    loc = re.sub(r"^[,\-\s]+|[,\-\s]+$", "", loc)
    return loc if loc else "Not Specified"

# List of skills to scan in heuristic fallback
SKILL_KEYWORDS = [
    "Python", "JavaScript", "TypeScript", "React", "Vue", "Angular", "Node.js", "Express", 
    "FastAPI", "Flask", "Django", "Java", "Spring Boot", "Spring", "Hibernate", "SQL", 
    "PostgreSQL", "MySQL", "SQLite", "MongoDB", "Redis", "HTML", "CSS", "Tailwind", "Bootstrap", 
    "C#", "C++", "Docker", "Kubernetes", "AWS", "Azure", "Google Cloud", "CI/CD", "Git", 
    "REST API", "GraphQL", "JUnit", "Jest", "Selenium", "Manual Testing", "Automation", 
    "QA", "Agile", "Scrum", "Redux", "Next.js", "DevOps", "Linux", "Figma",
    "MS PowerPoint", "MS Word", "MS Excel", "Microsoft Office", "PowerPoint", "Word", "Excel"
]

EXCLUDED_NAME_KEYWORDS = [
    "projects", "certifications", "education", "experience", "skills", "summary", 
    "objective", "profile", "about", "frameworks", "technologies", "languages", 
    "contact", "phone", "email", "address", "links", "hobbies", "interests",
    "declaration", "references", "work", "history", "employment", "achievements",
    "developed", "integrated", "optimized", "engineered", "created", "designed", "automated",
    "collaborated", "university", "college", "institute", "school", "bachelor", "master",
    "science", "engineering", "technology", "information", "prestige", "international", "website"
]

def extract_text_from_file(file_path: str) -> str:
    """Extract raw string text from PDF or DOCX file."""
    ext = os.path.splitext(file_path)[1].lower()
    text = ""
    
    if ext == ".pdf":
        try:
            with open(file_path, "rb") as f:
                reader = pypdf.PdfReader(f)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            print(f"Error reading PDF {file_path}: {str(e)}")
            raise ValueError("Failed to extract text from PDF file")
            
    elif ext in [".docx", ".doc"]:
        try:
            text = docx2txt.process(file_path)
        except Exception as e:
            print(f"Error reading DOCX {file_path}: {str(e)}")
            raise ValueError("Failed to extract text from DOCX file")
    else:
        raise ValueError("Unsupported file format. Please upload a PDF or DOCX file.")
        
    return text.strip()

def preprocess_pdf_text(text: str) -> str:
    """Fix column-glued words in raw text line-by-line while protecting email addresses."""
    lines = text.split("\n")
    cleaned_lines = []
    for line in lines:
        if "@" in line:
            # Protect email address from being split up (e.g. shay6dc@gmail.com -> shay 6 dc@gmail.com)
            email_match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", line)
            if email_match:
                email_str = email_match.group(0)
                # Replace with placeholder token
                placeholder = "__EMAIL_PLACEHOLDER__"
                line_placeholder = line.replace(email_str, placeholder)
                
                # Apply word spacing transitions
                line_placeholder = re.sub(r'([a-z])([A-Z])', r'\1 \2', line_placeholder)
                line_placeholder = re.sub(r'([A-Z]{2,})([a-z])', r'\1 \2', line_placeholder)
                line_placeholder = re.sub(r'([a-zA-Z])([+0-9])', r'\1 \2', line_placeholder)
                line_placeholder = re.sub(r'([0-9])([A-Za-z])', r'\1 \2', line_placeholder)
                
                # Restore original email
                line = line_placeholder.replace(placeholder, email_str)
                cleaned_lines.append(line)
                continue
                
        # Preprocess regular line
        line = re.sub(r'([a-z])([A-Z])', r'\1 \2', line)
        line = re.sub(r'([A-Z]{2,})([a-z])', r'\1 \2', line)
        line = re.sub(r'([a-zA-Z])([+0-9])', r'\1 \2', line)
        line = re.sub(r'([0-9])([A-Za-z])', r'\1 \2', line)
        cleaned_lines.append(line)
        
    return "\n".join(cleaned_lines)

def parse_with_heuristics(text: str, target_role: Optional[str] = None, target_level: Optional[str] = None) -> Dict[str, Any]:
    """Advanced fallback heuristic parser using regex and split cleans."""
    parsed_data = {
        "full_name": None,
        "email": None,
        "phone": None,
        "location": "Not Specified",
        "skills": [],
        "specialty_summary": "A professional with experience in software development."
    }
    
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    
    # 1. Extract Email
    # Standard email match
    email_match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text)
    if email_match:
        email_str = email_match.group(0)
        # Clean glued leading uppercase text
        email_str = re.sub(r"^[A-Z]{2,}(?=[a-z])", "", email_str)
        # Clean common words from email prefix
        for prefix in ["email", "e-mail", "contact", "undertaken", "projects", "certifications"]:
            if email_str.lower().startswith(prefix):
                email_str = email_str[len(prefix):]
        parsed_data["email"] = email_str.strip()
    else:
        # OCR fallback: handle spaces in domain (e.g. "help@enhancv com" instead of "help@enhancv.com")
        ocr_email_match = re.search(r"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+)\s+([a-zA-Z]{2,6})\b", text)
        if ocr_email_match:
            parsed_data["email"] = ocr_email_match.group(1) + "." + ocr_email_match.group(2)
        
    # 2. Extract Phone (broader regex supporting international formats)
    phone_patterns = [
        r"\+?\d{1,4}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{3,5}",  # General international
        r"\+?\d{10,15}",  # Continuous digits
    ]
    for pattern in phone_patterns:
        phone_match = re.search(pattern, text)
        if phone_match:
            phone_str = phone_match.group(0).strip()
            # Validate: must have at least 7 digits total
            digits_only = re.sub(r"\D", "", phone_str)
            if 7 <= len(digits_only) <= 15:
                # Filter out date ranges (e.g. 2022-2023, 2016-2021)
                if len(digits_only) == 8 and ("-" in phone_str or "/" in phone_str or "to" in phone_str):
                    parts = re.split(r"[-/]|to", phone_str)
                    if len(parts) == 2 and all(p.strip().isdigit() and len(p.strip()) == 4 for p in parts):
                        continue
                parsed_data["phone"] = phone_str
                break
        
    # 3. Extract Name
    candidate_names = []
    
    # Strategy A: Look for ALL-CAPS name at the beginning of text (common in CVs, especially OCR)
    # Scan the first few lines for consecutive ALL-CAPS words that look like a name
    all_caps_name = re.search(r"\b([A-Z][A-Z]+(?:\s+[A-Z][A-Z]+){1,3})\b", text[:500])
    if all_caps_name:
        name_candidate = all_caps_name.group(1).strip()
        name_lower = name_candidate.lower()
        # Filter out common section headers that are also ALL-CAPS
        section_headers = ["summary", "objective", "profile", "education", "experience", "skills",
                          "achievements", "certifications", "projects", "references", "languages",
                          "contact", "interests", "hobbies", "employment", "qualifications"]
        if not any(sh in name_lower for sh in section_headers) and len(name_candidate) <= 40:
            candidate_names.append(name_candidate)
    
    # Strategy B: Original line-by-line scan for Title Case names on short lines
    for line in lines:
        line_clean = line.strip()
        line_lower = line_clean.lower()
        
        # Strip common leading location prefix words
        for loc in ["colombo", "kadawatha", "kandy", "galle", "negombo", "gampaha", "malabe", "nugegoda", "sri lanka"]:
            if line_lower.startswith(loc):
                line_clean = line_clean[len(loc):].strip()
                line_lower = line_clean.lower()
                
        if not (5 <= len(line_clean) <= 30):
            continue
        if any(char.isdigit() for char in line_clean) or "@" in line_clean or "/" in line_clean or "," in line_clean or ":" in line_clean:
            continue
            
        if any(kw in line_lower for kw in EXCLUDED_NAME_KEYWORDS):
            continue
            
        words = line_clean.split()
        if len(words) >= 2 and all(w[0].isupper() for w in words if w):
            tech_terms = ["finance", "tracker", "website", "system", "ticketing", "real", "time", "goals", "personal", "development", "management", "prestige", "international", "logistics", "methodologies", "agile"]
            if not any(term in line_lower for term in tech_terms):
                candidate_names.append(line_clean)
                
    if candidate_names:
        name = candidate_names[0]
        parsed_data["full_name"] = clean_name(name)
    else:
        # Fallback to email username if nothing looks like a full name
        if parsed_data["email"]:
            username = parsed_data["email"].split("@")[0]
            # Strip trailing digits
            username = re.sub(r"\d+$", "", username)
            parsed_data["full_name"] = clean_name(username.replace(".", " "))

    # 4. Extract Location
    address_keywords = ["mawatha", "road", "street", "lane", "avenue", "gardens", "residence", "flat", "apartment", "eksath"]
    location_keywords = ["sri lanka", "colombo", "kadawatha", "kandy", "galle", "negombo", "gampaha", "malabe", "nugegoda", "battaramulla", "maharagama", "dehiwala", "mount lavinia", "ja-ela"]
    
    address_line = None
    address_idx = -1
    for idx, line in enumerate(lines):
        line_lower = line.lower()
        if any(edu in line_lower for edu in ["school", "university", "college", "institute", "education", "studies"]):
            continue
        if any(kw in line_lower for kw in address_keywords) or any(kw in line_lower for kw in location_keywords):
            cleaned = re.sub(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", "", line)
            cleaned = re.sub(r"(\+?\d{1,3}[-.\s]?)?\(?\d{2,3}\)?[-.\s]?\d{3}[-.\s]?\d{4,5}\b", "", cleaned)
            cleaned = re.sub(r"(?:Location|Address|Resides in):\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"(Objective|Summary|Skills|Education|Experience|Profile|About)\s*$", "", cleaned, flags=re.IGNORECASE)
            address_line = cleaned.strip()
            address_idx = idx
            break
            
    if address_line and address_idx != -1:
        # Check next line to see if it is a city/country to append
        if address_idx + 1 < len(lines):
            next_line = lines[address_idx + 1]
            next_line_lower = next_line.lower()
            if any(kw in next_line_lower for kw in location_keywords) and len(next_line.strip()) < 40:
                if not any(edu in next_line_lower for edu in ["school", "university", "college", "institute", "education", "studies"]):
                    cleaned_next = re.sub(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", "", next_line)
                    cleaned_next = re.sub(r"(\+?\d{1,3}[-.\s]?)?\(?\d{2,3}\)?[-.\s]?\d{3}[-.\s]?\d{4,5}\b", "", cleaned_next)
                    address_line += ", " + cleaned_next.strip()
                
        # If the candidate's name is inside the address line, strip it
        if parsed_data["full_name"]:
            address_line = address_line.replace(parsed_data["full_name"], "").strip()
        # Clean double commas and trailing punctuation
        address_line = re.sub(r",\s*,", ",", address_line)
        address_line = re.sub(r"^[,\-\s]+|[,\-\s]+$", "", address_line)
        parsed_data["location"] = address_line if address_line else "Not Specified"
    
    # Fallback: detect inline "City, Country" patterns (common in OCR text within long lines)
    if parsed_data["location"] == "Not Specified":
        country_codes = ["UK", "USA", "US", "UAE", "India", "Canada", "Australia", "Germany", "France", 
                        "Singapore", "Malaysia", "Saudi Arabia", "Sri Lanka", "Pakistan", "Bangladesh"]
        for code in country_codes:
            loc_match = re.search(rf"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s+{re.escape(code)}\b", text)
            if loc_match:
                parsed_data["location"] = loc_match.group(0).strip()
                break

    # 5. Extract Skills
    found_skills = []
    for skill in SKILL_KEYWORDS:
        pattern = rf"\b{re.escape(skill)}\b"
        if re.search(pattern, text, re.IGNORECASE):
            found_skills.append(skill)
    parsed_data["skills"] = found_skills

    # 6. Extract Specialty Summary
    summary_started = False
    summary_lines = []
    for line in lines:
        line_lower = line.lower()
        if any(sec in line_lower for sec in ["summary", "objective", "profile", "about me"]):
            summary_started = True
            continue
        if summary_started:
            if len(line) < 25 and any(sec in line_lower for sec in ["experience", "employment", "education", "skills", "projects"]):
                break
            summary_lines.append(line)
            
    if not summary_lines:
        # Paragraph scanner fallback: scan for motivational pronoun blocks
        for idx, line in enumerate(lines):
            line_clean = line.strip()
            line_lower = line_clean.lower()
            if len(line_clean.split()) >= 6 and (
                line_lower.startswith(("i'm", "i am", "seeking", "eager", "passionate", "highly", "motivated", "a motivated", "a passionate"))
                or "excited to" in line_lower
                or "eager to" in line_lower
            ):
                summary_lines.append(line_clean)
                next_idx = idx + 1
                while next_idx < len(lines):
                    next_line = lines[next_idx].strip()
                    next_lower = next_line.lower()
                    if not next_line:
                        break
                    # Break on section transitions or degree labels
                    if len(next_line) < 25 and any(sec in next_lower for sec in ["experience", "employment", "education", "skills", "projects", "certifications", "referees", "qualifications"]):
                        break
                    if any(kw in next_lower for kw in ["bsc", "hons", "degree", "university", "school", "referee", "iit"]):
                        break
                    if any(kw in next_lower for kw in address_keywords) or any(kw in next_lower for kw in location_keywords):
                        break
                    summary_lines.append(next_line)
                    next_idx += 1
                break
            
    if summary_lines:
        parsed_data["specialty_summary"] = " ".join(summary_lines).strip()
    else:
        if found_skills:
            parsed_data["specialty_summary"] = f"A tech professional skilled in {', '.join(found_skills[:4])}."
        else:
            parsed_data["specialty_summary"] = "A candidate with professional skills seeking role alignment."

    # 7. Generate Heuristic Suitability Suggestion
    role_label = target_role or "Software Engineer"
    level_label = target_level or "Junior"
    
    role_lower = role_label.lower()
    level_lower = level_label.lower()
    text_lower = text.lower()
    
    # Analyze candidate focus domains
    is_tech = any(skill.lower() in text_lower for skill in SKILL_KEYWORDS)
    is_hr_admin = any(kw in text_lower for kw in ["hr", "human resources", "admin", "administrator", "office", "business studies", "recruiting", "talent", "billing"])
    is_qa = any(kw in text_lower for kw in ["qa", "testing", "test", "selenium", "automation", "quality assurance"])
    is_devops = any(kw in text_lower for kw in ["devops", "docker", "kubernetes", "aws", "ci/cd", "pipelines"])
    
    focus_areas = []
    if is_qa:
        focus_areas.append("Quality Assurance & Testing")
    if is_devops:
        focus_areas.append("DevOps & Cloud Engineering")
    if not is_qa and not is_devops and is_tech:
        focus_areas.append("Software Development")
    if is_hr_admin:
        focus_areas.append("HR & Office Administration")
        
    candidate_focus = focus_areas[0] if focus_areas else "General/Non-technical Administration"
    
    # Classify target role type
    target_is_tech = any(kw in role_lower for kw in ["software", "engineer", "developer", "programmer", "frontend", "backend", "fullstack", "qa", "test", "devops", "cloud", "tech", "technology"])
    target_is_hr = any(kw in role_lower for kw in ["hr", "human", "resource", "recruit", "admin", "office", "manager", "operations"])
    
    # Check skills alignment
    matched_skills = []
    role_keywords = role_lower.split()
    for skill in found_skills:
        skill_lower = skill.lower()
        if "frontend" in role_lower and skill_lower in ["react", "vue", "angular", "html", "css", "tailwind", "figma", "javascript", "typescript"]:
            matched_skills.append(skill)
        elif "backend" in role_lower and skill_lower in ["node.js", "express", "fastapi", "django", "flask", "java", "spring", "sql", "postgresql", "mongodb", "python"]:
            matched_skills.append(skill)
        elif "qa" in role_lower or "test" in role_lower:
            if skill_lower in ["qa", "testing", "manual testing", "automation", "selenium", "jest", "junit"]:
                matched_skills.append(skill)
        elif "devops" in role_lower or "cloud" in role_lower:
            if skill_lower in ["docker", "kubernetes", "aws", "azure", "gcp", "devops", "ci/cd", "linux"]:
                matched_skills.append(skill)
        else:
            if any(kw in skill_lower for kw in role_keywords):
                matched_skills.append(skill)
                
    # Decision tree for suitability evaluation
    if target_is_tech:
        if is_hr_admin and not is_tech:
            suitability = f"Not suitable for the {level_label} {role_label} position. The candidate's background is in {candidate_focus} (e.g. Office Administration/Business Studies), and they lack the required technical programming, software engineering skills, or experience in tech tools."
        elif not matched_skills:
            if found_skills:
                suitability = f"Not suitable for this specific technical role. While the candidate has skills in {', '.join(found_skills[:3])}, they do not match the required skill set for a {level_label} {role_label} position."
            else:
                suitability = f"Not suitable. The candidate profile lacks any relevant software engineering, QA, or technical skills matching the requirements for a {level_label} {role_label} role."
        else:
            if "senior" in level_lower or "lead" in level_lower or "principal" in level_lower:
                if len(matched_skills) < 3:
                    suitability = f"Marginally suitable. The candidate has relevant skills like {', '.join(matched_skills)}, but might lack the deep technical seniority and experience required for a {level_label} {role_label} position."
                else:
                    suitability = f"Suitable fit for {level_label} {role_label}. Matches key required skills like {', '.join(matched_skills[:3])}. Their background aligns well with the specifications."
            else:
                suitability = f"Suitable fit for {level_label} {role_label}. They demonstrate strong capability in {', '.join(matched_skills[:3])} which matches the role requirements."
                
    elif target_is_hr:
        if is_hr_admin:
            suitability = f"Suitable fit for the {level_label} {role_label} position. They have a strong foundational background in Business Studies and Office Administration, matching key operational and human resources competencies."
        else:
            suitability = f"Marginally suitable. The candidate's primary focus is {candidate_focus}. They may need additional training in office operations and HR policies to align with the {level_label} {role_label} role."
            
    else:
        if matched_skills:
            suitability = f"Suitable fit for {level_label} {role_label}. Matches key required skills like {', '.join(matched_skills[:3])}."
        else:
            suitability = f"Candidate has skills in {', '.join(found_skills[:3]) if found_skills else 'non-technical domains'}. Recommended to review their CV manually to determine match for the {level_label} {role_label} role."
                
    parsed_data["suitability_suggestion"] = suitability
    if parsed_data.get("full_name"):
        parsed_data["full_name"] = clean_name(parsed_data["full_name"])
    if parsed_data.get("location"):
        parsed_data["location"] = clean_location(parsed_data["location"])
    return parsed_data

def get_heuristic_twin_fallback(skills: List[str], target_role: Optional[str] = None, target_level: Optional[str] = None) -> Dict[str, Any]:
    role = target_role or "Software Engineer"
    level = target_level or "Junior"
    
    # Simple predicted roles list
    predicted_roles = [role]
    if "Software" in role:
        predicted_roles.append("Full Stack Developer")
        predicted_roles.append("Backend Developer")
    
    # Simple strengths
    strengths = [
        {"title": f"Technical Foundation in {', '.join(skills[:2]) if skills else 'Software Engineering'}", "rationale": "Demonstrates core proficiency with foundational technologies and practices."},
        {"title": "Adaptability", "rationale": "Capable of picking up new technologies and adapting to different development workflows."}
    ]
    
    # Simple hidden skills
    hidden = [
        {"skill": "Problem Solving", "reasoning": "Inferred from educational background and project execution details."},
        {"skill": "Team Collaboration", "reasoning": "Inferred from experiences working on group assignments or team projects."}
    ]
    
    # Recommended paths
    paths = [f"Specialize further in {role}", "Advance to Senior developer roles by building system design expertise"]
    
    # Interview questions
    questions = {
        "technical": [
            f"Explain the lifecycle of a request in a system utilizing your primary stack ({', '.join(skills[:2]) if skills else 'web technologies'}).",
            "How do you optimize database query performance for large datasets?"
        ],
        "scenario": [
            "Describe a time when you had to debug a production issue under tight deadlines. What was your approach?",
            f"How would you approach migrating a module of an application to a new technology that fits the {role} requirements?"
        ],
        "behavioral": [
            "Tell me about a challenging team project. How did you resolve conflicts and coordinate with members?",
            "How do you prioritize tasks when working under multiple tight deadlines?"
        ]
    }
    
    return {
        "predicted_level": level,
        "level_confidence": 75.0,
        "predicted_roles": predicted_roles,
        "strengths_analysis": strengths,
        "hidden_skills": hidden,
        "growth_potential": "Medium",
        "growth_reasoning": f"Shows solid capability for a {level} role. Growth to higher seniorities is likely as they gain more hands-on production experience.",
        "recommended_paths": paths,
        "interview_questions": questions
    }

def parse_cv(file_path: str, target_role: Optional[str] = None, target_level: Optional[str] = None) -> Dict[str, Any]:
    """Parse CV by first extracting text and then using Gemini API or heuristics fallback."""
    ext = os.path.splitext(file_path)[1].lower()
    
    # 1. Try to extract raw text locally
    raw_text = ""
    try:
        raw_text = extract_text_from_file(file_path)
        raw_text = preprocess_pdf_text(raw_text)
    except Exception as e:
        print(f"Local text extraction failed for {file_path}: {str(e)}")

    if GEMINI_API_KEY:
        try:
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-2.5-flash")
            schema = to_gemini_schema(CVExtractionSchema.model_json_schema())
            
            prompt = f"""
            You are an expert recruitment AI. Extract the candidate's structured profile information and build an AI Candidate Digital Twin.
            
            Strictly extract:
            1. full_name: Candidate name
            2. email: Candidate email address
            3. phone: Candidate phone number
            4. location: Candidate city or country (e.g. Kadawatha, Sri Lanka)
            5. list of skills (e.g. programming languages, libraries, platforms, methodologies)
            6. specialty_summary: Extract the candidate's professional summary, profile, or objective section from their CV. If there is no explicit section, extract the paragraph under their name that outlines their focus. Do not summarize this; extract it as close to the original text as possible.
            7. suitability_suggestion: Evaluate this candidate's suitability for the target role: "{target_role or 'Not Specified'}" and target seniority level: "{target_level or 'Not Specified'}". Provide a 2-3 sentence suggestion explaining why they are or aren't a good fit based on their skills and resume content. Be critical and honest.
            
            Also generate the Candidate Digital Twin:
            8. predicted_level: predict seniority level (one of: "Intern", "Associate", "Junior", "Mid-Level", "Senior", "Lead")
            9. level_confidence: confidence percentage (float between 0 and 100)
            10. predicted_roles: 2-3 matching professional roles
            11. strengths_analysis: 2-3 key strengths with a title and brief rationale based on the CV
            12. hidden_skills: 2-3 hidden/inferred skills (soft or hard skills not explicitly listed, but demonstrated or implied) with reasoning
            13. growth_potential: "High", "Medium", or "Low"
            14. growth_reasoning: explanation of why they have this growth potential
            15. recommended_paths: 2-3 professional career paths/goals
            16. interview_questions: personalized technical, scenario-based, and behavioral questions (3 of each type) designed to probe their specific experience.
            """
            
            # If it's a PDF and has no local text, treat it as a scanned/image PDF
            # We extract page images and pass them inline directly, bypassing the Files API
            if ext == ".pdf" and not raw_text.strip():
                print(f"PDF {file_path} has no selectable text. Extracting images for inline Gemini Vision...")
                images = []
                try:
                    reader = pypdf.PdfReader(file_path)
                    for page in reader.pages:
                        for image_obj in page.images:
                            images.append({
                                "mime_type": "image/png",
                                "data": image_obj.data
                            })
                except Exception as img_err:
                    print(f"Failed to extract images from scanned PDF: {str(img_err)}")
                
                # Filter for images likely to be page scans (size > 20KB)
                page_images = [img for img in images if len(img["data"]) > 20480]
                if not page_images and images:
                    page_images = images
                
                if page_images:
                    # Send the first page image inline to Gemini
                    response = model.generate_content(
                        [page_images[0], prompt],
                        generation_config={
                            "response_mime_type": "application/json",
                            "response_schema": schema,
                        }
                    )
                    extracted_data = json.loads(response.text)
                    if extracted_data.get("full_name"):
                        extracted_data["full_name"] = clean_name(extracted_data["full_name"])
                    if extracted_data.get("location"):
                        extracted_data["location"] = clean_location(extracted_data["location"])
                    extracted_data["cv_text"] = ""
                    extracted_data["parsed_by"] = "gemini"
                    return extracted_data
            
            # For standard PDFs or Word files (where raw_text is populated)
            if raw_text.strip():
                full_prompt = prompt + f"\n\nRaw CV Text:\n---\n{raw_text}\n---"
                response = model.generate_content(
                    full_prompt,
                    generation_config={
                        "response_mime_type": "application/json",
                        "response_schema": schema,
                    }
                )
                extracted_data = json.loads(response.text)
                if extracted_data.get("full_name"):
                    extracted_data["full_name"] = clean_name(extracted_data["full_name"])
                if extracted_data.get("location"):
                    extracted_data["location"] = clean_location(extracted_data["location"])
                extracted_data["cv_text"] = raw_text
                extracted_data["parsed_by"] = "gemini"
                return extracted_data
                
        except Exception as e:
            print(f"Gemini API parse failed ({str(e)}). Falling back to local heuristic parsing.")

    # Fallback to local heuristic parsing
    print("Running fallback local heuristic parsing...")
    result = parse_with_heuristics(raw_text, target_role, target_level)
    if result.get("full_name"):
        result["full_name"] = clean_name(result["full_name"])
    if result.get("location"):
        result["location"] = clean_location(result["location"])
    result["cv_text"] = raw_text
    
    # Merge digital twin fallback data
    twin_fallback = get_heuristic_twin_fallback(result.get("skills", []), target_role, target_level)
    result.update(twin_fallback)
    
    result["parsed_by"] = "heuristic"
    return result

def generate_digital_twin_only(cv_text: str, target_role: Optional[str] = None, target_level: Optional[str] = None) -> Dict[str, Any]:
    """Dedicated function to generate only digital twin insights from CV text using Gemini API, or fallback heuristics."""
    if GEMINI_API_KEY:
        try:
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-2.5-flash")
            schema = to_gemini_schema(DigitalTwinSchema.model_json_schema())
            
            prompt = f"""
            You are an expert recruitment AI. Analyze the candidate's CV text and create a detailed professional "Candidate Digital Twin".
            
            Based on the CV text below, and targeting the role: "{target_role or 'Not Specified'}" and level: "{target_level or 'Not Specified'}", generate:
            
            1. predicted_level: seniority levels are: "Intern", "Associate", "Junior", "Mid-Level", "Senior", "Lead"
            2. level_confidence: confidence percentage (float between 0 and 100)
            3. predicted_roles: 2-3 matching professional roles
            4. strengths_analysis: 2-3 key strengths with a title and brief rationale based on the CV
            5. hidden_skills: 2-3 hidden/inferred soft or hard skills (not explicitly named under skills, but demonstrated or logically implied) with reasoning
            6. growth_potential: "High", "Medium", or "Low"
            7. growth_reasoning: explanation of why they have this growth potential
            8. recommended_paths: 2-3 professional career paths/goals
            9. interview_questions: personalized technical, scenario-based, and behavioral questions (3 of each type) designed to probe their specific experience and credentials.
            
            Raw CV Text:
            ---
            {cv_text}
            ---
            """
            
            response = model.generate_content(
                prompt,
                generation_config={
                    "response_mime_type": "application/json",
                    "response_schema": schema,
                }
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"Gemini digital twin API call failed: {str(e)}. Using fallback heuristics.")
            
    # Parse skills from text for fallback context
    found_skills = []
    for skill in SKILL_KEYWORDS:
        pattern = rf"\b{re.escape(skill)}\b"
        if re.search(pattern, cv_text, re.IGNORECASE):
            found_skills.append(skill)
            
    return get_heuristic_twin_fallback(found_skills, target_role, target_level)

