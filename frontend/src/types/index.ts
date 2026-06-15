export interface User {
  id: number;
  email: string;
  full_name?: string | null;
  role: 'Candidate' | 'Recruiter' | 'Admin';
  level: 'Intern' | 'Associate/Junior' | 'Mid-Level' | 'Senior' | 'Lead/Principal' | 'None';
  title_role: string | null;
  is_active: boolean;
}

export interface StrengthAnalysis {
  title: string;
  rationale: string;
}

export interface HiddenSkill {
  skill: string;
  reasoning: string;
}

export interface InterviewQuestions {
  technical: string[];
  scenario: string[];
  behavioral: string[];
}

export interface CandidateDigitalTwin {
  id: number;
  candidate_id: number;
  predicted_level: string | null;
  level_confidence: number | null;
  predicted_roles: string[];
  strengths_analysis: StrengthAnalysis[];
  hidden_skills: HiddenSkill[];
  growth_potential: string | null;
  growth_reasoning: string | null;
  recommended_paths: string[];
  interview_questions: InterviewQuestions;
  updated_at: string;
}

export interface CandidateProfile {
  id: number;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  skills: string[];
  specialty_summary: string | null;
  suitability_suggestion: string | null;
  hr_note: string | null;
  is_strong: boolean;
  role_id: number | null;
  level_id: number | null;
  role_name?: string;
  level_name?: string;
  cv_text: string | null;
  cv_file_path: string | null;
  created_at: string;
  digital_twin?: CandidateDigitalTwin | null;
}

export type SearchResultCandidate = CandidateProfile;

