import React, { useState, useEffect, useRef } from 'react';
import { api, ApiError } from '../services/api';
import { CandidateProfile } from '../types';
import { 
  Upload, Trash, Check, X, AlertCircle, User, Award
} from 'lucide-react';
import { Card, Button, InputField, SelectField, ConfirmModal } from '../components/UIComponents';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const ExtractCV: React.FC = () => {
  const [uploading, setUploading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dynamic Options from DB
  const [roles, setRoles] = useState<{ id: number; name: string; candidate_count: number }[]>([]);
  const [levels, setLevels] = useState<{ id: number; name: string }[]>([]);
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);

  // Main Form Fields
  const [selectedRoleId, setSelectedRoleId] = useState<number | string>('');
  const [selectedLevelId, setSelectedLevelId] = useState<number | string>('');
  const [hrNote, setHrNote] = useState<string>('');
  const [isStrong, setIsStrong] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [duplicateWarning, setDuplicateWarning] = useState<any | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<number | null>(null);

  // Extracted Fields for Modal
  const [extractedName, setExtractedName] = useState<string>('');
  const [extractedEmail, setExtractedEmail] = useState<string>('');
  const [extractedPhone, setExtractedPhone] = useState<string>('');
  const [extractedLocation, setExtractedLocation] = useState<string>('');
  const [extractedSkillsStr, setExtractedSkillsStr] = useState<string>('');
  const [extractedSummary, setExtractedSummary] = useState<string>('');
  const [extractedSuitability, setExtractedSuitability] = useState<string>('');
  const [extractedCvText, setExtractedCvText] = useState<string>('');
  const [extractedCvFilePath, setExtractedCvFilePath] = useState<string>('');
  const [parsedBy, setParsedBy] = useState<string>('gemini');

  // Digital Twin Fields
  const [extractedPredictedLevel, setExtractedPredictedLevel] = useState<string>('');
  const [extractedLevelConfidence, setExtractedLevelConfidence] = useState<number>(0);
  const [extractedPredictedRoles, setExtractedPredictedRoles] = useState<string[]>([]);
  const [extractedStrengthsAnalysis, setExtractedStrengthsAnalysis] = useState<any[]>([]);
  const [extractedHiddenSkills, setExtractedHiddenSkills] = useState<any[]>([]);
  const [extractedGrowthPotential, setExtractedGrowthPotential] = useState<string>('');
  const [extractedGrowthReasoning, setExtractedGrowthReasoning] = useState<string>('');
  const [extractedRecommendedPaths, setExtractedRecommendedPaths] = useState<string[]>([]);
  const [extractedInterviewQuestions, setExtractedInterviewQuestions] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchOptions();
    fetchRecentCandidates();
  }, []);

  const fetchOptions = async () => {
    try {
      const rolesData = await api.get<any[]>('/api/roles');
      const levelsData = await api.get<any[]>('/api/levels');
      setRoles(rolesData);
      setLevels(levelsData);
    } catch (err: any) {
      setError('Failed to load categories.');
    }
  };

  const fetchRecentCandidates = async () => {
    try {
      const data = await api.get<CandidateProfile[]>('/api/cv/candidates');
      setCandidates(data);
    } catch (err: any) {}
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf' || ext === 'docx') {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Unsupported file format. Please upload PDF or DOCX files.');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const clearSelectedFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Upload and Analyze API Action
  const handleAnalyzeCV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select or drag a CV document to analyze.');
      return;
    }
    if (!selectedRoleId) {
      setError('Candidate Role selection is required.');
      return;
    }
    if (!selectedLevelId) {
      setError('Target Level selection is required.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const data = await api.uploadCV<any>(selectedFile, selectedRoleId, selectedLevelId);

      // Populate Extracted details to edit in modal
      setExtractedName(data.full_name || '');
      setExtractedEmail(data.email || '');
      setExtractedPhone(data.phone || '');
      setExtractedLocation(data.location || 'Not Specified');
      setExtractedSkillsStr(data.skills ? data.skills.join(', ') : '');
      setExtractedSummary(data.specialty_summary || '');
      setExtractedSuitability(data.suitability_suggestion || '');
      setExtractedCvText(data.cv_text || '');
      setExtractedCvFilePath(data.cv_file_path || '');
      setParsedBy(data.parsed_by || 'gemini');

      // Populate Twin states
      setExtractedPredictedLevel(data.predicted_level || '');
      setExtractedLevelConfidence(data.level_confidence || 0);
      setExtractedPredictedRoles(data.predicted_roles || []);
      setExtractedStrengthsAnalysis(data.strengths_analysis || []);
      setExtractedHiddenSkills(data.hidden_skills || []);
      setExtractedGrowthPotential(data.growth_potential || '');
      setExtractedGrowthReasoning(data.growth_reasoning || '');
      setExtractedRecommendedPaths(data.recommended_paths || []);
      setExtractedInterviewQuestions(data.interview_questions || null);

      // Check for duplicate candidate warnings
      if (data.duplicate) {
        setDuplicateWarning(data.duplicate);
      } else {
        setDuplicateWarning(null);
      }
      setModalError(null);
      setShowModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze CV.');
    } finally {
      setUploading(false);
    }
  };

  // Save candidate profile to database
  const handleSaveToLibrary = async () => {
    setModalError(null);
    if (!extractedName.trim()) {
      setModalError('Candidate Name is required.');
      return;
    }
    if (!extractedEmail.trim()) {
      setModalError('Email Address is required.');
      return;
    }

    setSaving(true);
    try {
      const skillsArray = extractedSkillsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        full_name: extractedName,
        email: extractedEmail,
        phone: extractedPhone,
        location: extractedLocation,
        skills: skillsArray,
        specialty_summary: extractedSummary,
        suitability_suggestion: extractedSuitability,
        hr_note: hrNote,
        is_strong: isStrong,
        role_id: Number(selectedRoleId),
        level_id: Number(selectedLevelId),
        cv_text: extractedCvText,
        cv_file_path: extractedCvFilePath,

        // Digital twin fields
        predicted_level: extractedPredictedLevel,
        level_confidence: extractedLevelConfidence,
        predicted_roles: extractedPredictedRoles,
        strengths_analysis: extractedStrengthsAnalysis,
        hidden_skills: extractedHiddenSkills,
        growth_potential: extractedGrowthPotential,
        growth_reasoning: extractedGrowthReasoning,
        recommended_paths: extractedRecommendedPaths,
        interview_questions: extractedInterviewQuestions,
      };

      // The extract endpoint surfaced a duplicate to the user; if they kept
      // going, route the save to PUT against the existing record rather than
      // letting POST fail with 409.
      if (duplicateWarning && duplicateWarning.id) {
        await api.put(`/api/cv/candidates/${duplicateWarning.id}`, payload);
        setSuccessMsg(`Existing candidate "${duplicateWarning.full_name || extractedName}" updated.`);
      } else {
        try {
          await api.post('/api/cv/candidates', payload);
          setSuccessMsg('Candidate saved successfully to Sysco HR library!');
        } catch (e) {
          if (e instanceof ApiError && e.status === 409) {
            const existingId = e.detail && typeof e.detail === 'object' ? e.detail.existing_id : null;
            const existingName = e.detail && typeof e.detail === 'object' ? e.detail.existing_full_name : null;
            if (existingId) {
              await api.put(`/api/cv/candidates/${existingId}`, payload);
              setSuccessMsg(`Existing candidate "${existingName || extractedName}" updated.`);
            } else {
              throw e;
            }
          } else {
            throw e;
          }
        }
      }

      setShowModal(false);

      // Reset main form states
      setSelectedRoleId('');
      setSelectedLevelId('');
      setHrNote('');
      setIsStrong(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Re-fetch roles library counts and recent additions
      fetchOptions();
      fetchRecentCandidates();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save candidate.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = (id: number) => {
    setRoleToDelete(id);
  };

  const confirmDeleteRole = async (id: number) => {
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/roles/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setRoles(roles.filter((r) => r.id !== id));
        fetchRecentCandidates();
      } else {
        throw new Error('Failed to delete role');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete role.');
    }
  };

  // Options helpers
  const roleOptions = [
    { value: '', label: 'Select Role' },
    ...roles.map((r) => ({ value: r.id, label: r.name })),
  ];

  const levelOptions = [
    { value: '', label: 'Select Level' },
    ...levels.map((l) => ({ value: l.id, label: l.name })),
  ];

  // Utility to style dynamic role badges
  const getRoleBadgeColor = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('software')) return 'bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-400';
    if (lower.includes('frontend')) return 'bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30 text-purple-700 dark:text-purple-400';
    if (lower.includes('backend')) return 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400';
    if (lower.includes('ux') || lower.includes('ui') || lower.includes('design')) return 'bg-pink-50 dark:bg-pink-950/20 border-pink-100 dark:border-pink-900/30 text-pink-700 dark:text-pink-400';
    if (lower.includes('qa') || lower.includes('test')) return 'bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30 text-orange-700 dark:text-orange-400';
    if (lower.includes('hr') || lower.includes('human') || lower.includes('recruit')) return 'bg-teal-50 dark:bg-teal-950/20 border-teal-100 dark:border-teal-900/30 text-teal-700 dark:text-teal-400';
    return 'bg-gray-50 dark:bg-bg-page/50 border border-gray-100 dark:border-border-main text-gray-700 dark:text-text-secondary';
  };

  // Helper to format relative time
  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return '';
    // If the database datetime is in UTC but has no timezone suffix, append 'Z' to parse it correctly as UTC in the browser
    const utcDateStr = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`;
    const date = new Date(utcDateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Sort candidates by creation time and get latest 3
  const recentAdditions = [...candidates]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      {/* LEFT COLUMN: Extraction upload form */}
      <div className="xl:col-span-2 space-y-6">
        <div className="mb-4">
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Extract Candidate CV</h1>
          <p className="text-text-secondary text-sm">Upload a resume to run AI extraction, review structured results, and assign roles.</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-error text-sm font-semibold rounded-btn flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-success text-sm font-semibold rounded-btn flex items-center gap-2">
            <Check size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {uploading ? (
          <Card className="flex flex-col items-center justify-center py-24 border border-dashed border-primary-300">
            <Upload className="text-primary-500 animate-bounce mb-3" size={40} />
            <p className="text-sm font-semibold text-primary-700">Running AI CV Extraction engine...</p>
            <p className="text-xs text-text-secondary mt-1">This might take a moment to scan the document sections.</p>
          </Card>
        ) : (
          <Card className="border border-border-main shadow-sm p-8">
            <form onSubmit={handleAnalyzeCV} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SelectField
                  label="Select Candidate Role *"
                  options={roleOptions}
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  required
                />
                <SelectField
                  label="Select Target Level *"
                  options={levelOptions}
                  value={selectedLevelId}
                  onChange={(e) => setSelectedLevelId(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1 leading-5">
                  Optional HR Assessment Note
                </label>
                <textarea
                  value={hrNote}
                  onChange={(e) => setHrNote(e.target.value)}
                  placeholder="Enter custom comments, hiring highlights, or special considerations..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm bg-input-bg border border-input-border text-text-primary rounded-input focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div>
                <label className="inline-flex items-center gap-2.5 px-4 py-3 border border-border-main rounded-lg bg-bg-card hover:bg-bg-page/50 cursor-pointer select-none transition-colors">
                  <input
                    type="checkbox"
                    checked={isStrong}
                    onChange={(e) => setIsStrong(e.target.checked)}
                    className="w-4 h-4 text-primary-600 bg-input-bg border border-input-border rounded focus:ring-primary-500 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-text-primary">Mark as Strong Candidate</span>
                </label>
              </div>

              {/* Drag and Drop CV File */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`border-2 border-dashed rounded-card p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                  dragActive 
                    ? 'border-primary-500 bg-primary-50/30' 
                    : 'border-border-main hover:border-primary-400 hover:bg-bg-page/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.docx"
                  className="hidden"
                />

                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mb-4">
                  <Upload size={24} />
                </div>

                {!selectedFile ? (
                  <>
                    <p className="text-sm font-bold text-text-primary mb-1">
                      Drag & Drop files here
                    </p>
                    <p className="text-xs text-text-secondary mb-2">or click to browse</p>
                    <p className="text-[10px] text-text-secondary opacity-70">
                      Accepts PDF, DOCX, DOC, or TXT up to 10MB
                    </p>
                  </>
                ) : (
                  <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-4 py-2 rounded-full shadow-xs shrink-0 max-w-full">
                    <span>✓ Selected file: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                    <button
                      type="button"
                      onClick={clearSelectedFile}
                      className="text-blue-500 hover:text-red-500 focus:outline-none transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                fullWidth
                disabled={!selectedFile || !selectedRoleId || !selectedLevelId}
                className="py-3 font-bold text-base"
              >
                Upload and Analyze CV
              </Button>
            </form>
          </Card>
        )}
      </div>

      {/* RIGHT COLUMN: Sidebar cards */}
      <div className="xl:col-span-1 space-y-6">
        {/* Roles Library */}
        <Card className="border border-border-main">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border-main">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Award size={18} />
            </div>
            <h3 className="font-bold text-text-primary text-base">Roles Library</h3>
          </div>

          {roles.length === 0 ? (
            <p className="text-xs text-text-secondary py-3 text-center">No configured roles.</p>
          ) : (
            <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
              {roles.map((role) => (
                <div key={role.id} className="flex items-start gap-3 justify-between group">
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleDeleteRole(role.id)}
                      className="text-text-secondary/50 hover:text-red-500 transition-colors mt-0.5"
                      title="Delete role"
                    >
                      <Trash size={14} />
                    </button>
                    <div>
                      <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full border ${getRoleBadgeColor(role.name)}`}>
                        {role.name}
                      </span>
                      <p className="text-[10px] text-text-secondary font-semibold mt-0.5 pl-1">
                        {role.candidate_count || 0} Candidates
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Additions */}
        <Card className="border border-border-main">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border-main">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <User size={18} />
            </div>
            <h3 className="font-bold text-text-primary text-base">Recent Additions</h3>
          </div>

          {recentAdditions.length === 0 ? (
            <p className="text-xs text-text-secondary py-3 text-center">No candidates saved yet.</p>
          ) : (
            <div className="space-y-4 pr-1">
              {recentAdditions.map((cand) => (
                <div key={cand.id} className="flex items-start gap-3 border-b border-border-main pb-3 last:border-b-0 last:pb-0">
                  <div className="w-8 h-8 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center shrink-0">
                    <User size={14} />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-text-primary truncate">{cand.full_name || 'No Name'}</h4>
                    <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${getRoleBadgeColor(cand.role_name || '')} mt-1`}>
                      {cand.role_name}
                    </span>
                    <span className="text-[9px] text-text-secondary font-semibold block mt-1">
                      {formatRelativeTime(cand.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ANALYSIS SUMMARY MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-xs">
          <div className="bg-bg-card rounded-modal shadow-modal border border-border-main text-text-primary w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col animate-fade-in">
            
            {/* Header */}
            <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold">CV Extraction Analysis Summary</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-white hover:text-blue-100 transition-colors focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-error text-xs font-semibold rounded-btn animate-fade-in">
                  {modalError}
                </div>
              )}
              
              {/* Duplicate Banner */}
              {duplicateWarning && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2.5 animate-fade-in">
                  <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-800 text-sm mb-1">
                      Warning: Candidate Duplicate Detected!
                    </p>
                    <p className="leading-relaxed">
                      Candidate with this email/phone already exists in Sysco HR:{' '}
                      <span className="font-bold">{duplicateWarning.full_name}</span> ({duplicateWarning.email} | {duplicateWarning.phone}) mapped to {duplicateWarning.level_name} {duplicateWarning.role_name}.
                    </p>
                  </div>
                </div>
              )}

              {/* Fallback Parsing Warning */}
              {parsedBy === 'heuristic' && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs rounded-lg flex items-start gap-2.5 animate-fade-in">
                  <AlertCircle size={18} className="shrink-0 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-500 text-sm mb-1">
                      Gemini API Limit Exceeded / Fallback Parsing Active
                    </p>
                    <p className="leading-relaxed text-text-primary">
                      {extractedCvText ? (
                        "The daily Gemini API request quota was exceeded. Reverted to local rule-based heuristic parsing. Please double-check and refine all extracted fields below."
                      ) : (
                        "Scanned document detected and Gemini API quota was exceeded. Image/Vision processing was unavailable. Please enter the candidate details manually."
                      )}
                    </p>
                  </div>
                </div>
              )}

              <p className="text-xs text-text-secondary italic">
                Verify and refine the extracted contact credentials and CV summary details before adding them permanently to the Sysco HR library.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Candidate Name *"
                  value={extractedName}
                  onChange={(e) => setExtractedName(e.target.value)}
                  required
                />
                <InputField
                  label="Email Address *"
                  type="email"
                  value={extractedEmail}
                  onChange={(e) => setExtractedEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Phone Number"
                  value={extractedPhone}
                  onChange={(e) => setExtractedPhone(e.target.value)}
                />
                <InputField
                  label="Location"
                  value={extractedLocation}
                  onChange={(e) => setExtractedLocation(e.target.value)}
                />
              </div>

              <div>
                <InputField
                  label="Skills Tags (comma separated)"
                  value={extractedSkillsStr}
                  onChange={(e) => setExtractedSkillsStr(e.target.value)}
                  placeholder="React, Python, TypeScript..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Specialty Brief Summary
                </label>
                <textarea
                  value={extractedSummary}
                  onChange={(e) => setExtractedSummary(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-sm bg-input-bg border border-input-border text-text-primary rounded-input focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  placeholder="A summary of candidate achievements, specialty, and tech domains..."
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-2">
                <label className="block text-xs font-bold text-blue-400 leading-none">
                  AI Suitability Match Suggestion
                </label>
                <p className="text-[10px] text-blue-400/90 leading-tight mb-2">
                  Automatically generated review evaluating fit for the selected role & level. Edit if necessary.
                </p>
                <textarea
                  value={extractedSuitability}
                  onChange={(e) => setExtractedSuitability(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-input-bg border border-blue-500/30 rounded-md focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-text-primary"
                  placeholder="Evaluation of candidate's suitability for the target position..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border-main flex items-center justify-end gap-3 shrink-0">
              <Button 
                variant="secondary" 
                onClick={() => setShowModal(false)}
                className="px-5 py-2 text-xs font-bold"
              >
                Discard & Cancel
              </Button>
              <Button 
                onClick={handleSaveToLibrary} 
                disabled={saving}
                className="px-6 py-2 text-xs font-bold"
              >
                {saving ? 'Saving...' : 'Save to Sysco HR Library'}
              </Button>
            </div>

          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={roleToDelete !== null}
        title="Delete Job Role"
        message="Are you sure you want to delete this job role? Candidates linked to it will be set to Unassigned."
        onConfirm={() => {
          if (roleToDelete !== null) {
            confirmDeleteRole(roleToDelete);
            setRoleToDelete(null);
          }
        }}
        onCancel={() => setRoleToDelete(null)}
      />
    </div>
  );
};
