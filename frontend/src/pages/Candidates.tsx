import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { CandidateProfile } from '../types';
import {
  Search, Mail, Phone, Trash, Edit, X, Eye, AlertCircle, Filter, MapPin, FileText, Star,
  Copy, Brain, HelpCircle, RefreshCw, ChevronDown
} from 'lucide-react';
import { Card, Button, InputField, SelectField, ConfirmModal } from '../components/UIComponents';

export const Candidates: React.FC = () => {
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dropdown Categories
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [levels, setLevels] = useState<{ id: number; name: string }[]>([]);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');

  // Modals
  const [viewCandidate, setViewCandidate] = useState<CandidateProfile | null>(null);
  const [editCandidate, setEditCandidate] = useState<CandidateProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'twin' | 'interview'>('profile');
  const [isTabSelectOpen, setIsTabSelectOpen] = useState<boolean>(false);
  const tabSelectJustChangedRef = useRef<boolean>(false);
  const [regeneratingTwin, setRegeneratingTwin] = useState<boolean>(false);
  const [copiedQuestion, setCopiedQuestion] = useState<string | null>(null);

  const handleTabSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    tabSelectJustChangedRef.current = true;
    setIsTabSelectOpen(false);
    setActiveTab(e.target.value as 'profile' | 'twin' | 'interview');
    e.target.blur();
    setTimeout(() => {
      tabSelectJustChangedRef.current = false;
    }, 100);
  };

  const handleTabSelectClick = () => {
    if (tabSelectJustChangedRef.current) {
      return;
    }
    setIsTabSelectOpen(!isTabSelectOpen);
  };

  const handleTabSelectBlur = () => {
    setIsTabSelectOpen(false);
  };

  const handleRegenerateTwin = async (candidateId: number) => {
    setRegeneratingTwin(true);
    try {
      const updatedTwin = await api.post<any>(`/api/cv/candidates/${candidateId}/regenerate-twin`, {});
      
      // Update in local state for candidates list
      setCandidates(prev => prev.map(c => {
        if (c.id === candidateId) {
          return {
            ...c,
            digital_twin: updatedTwin
          };
        }
        return c;
      }));
      
      // Update currently viewed candidate modal state
      setViewCandidate(prev => {
        if (prev && prev.id === candidateId) {
          return {
            ...prev,
            digital_twin: updatedTwin
          };
        }
        return prev;
      });
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate digital twin');
    } finally {
      setRegeneratingTwin(false);
    }
  };

  const handleCopyQuestion = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedQuestion(text);
    setTimeout(() => {
      setCopiedQuestion(null);
    }, 2000);
  };

  const [editError, setEditError] = useState<string | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<number | null>(null);

  // Edit Form states
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editSkillsStr, setEditSkillsStr] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editSuitability, setEditSuitability] = useState('');
  const [editHrNote, setEditHrNote] = useState('');
  const [editIsStrong, setEditIsStrong] = useState<boolean>(false);
  const [editRoleId, setEditRoleId] = useState<number | string>('');
  const [editLevelId, setEditLevelId] = useState<number | string>('');

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCandidates();
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedRole, selectedLevel, selectedSkill]);

  const fetchOptions = async () => {
    try {
      const rolesData = await api.get<{ id: number; name: string }[]>('/api/roles');
      const levelsData = await api.get<{ id: number; name: string }[]>('/api/levels');
      setRoles(rolesData);
      setLevels(levelsData);
    } catch (err: any) { }
  };

  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (selectedRole) params.append('role_id', selectedRole);
      if (selectedLevel) params.append('level_id', selectedLevel);
      if (selectedSkill) params.append('skill', selectedSkill);

      const data = await api.get<CandidateProfile[]>(`/api/cv/candidates?${params.toString()}`);
      setCandidates(data);
    } catch (err: any) {
      setError(err.message || 'Failed to search candidate profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCandidates();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedRole('');
    setSelectedLevel('');
    setSelectedSkill('');
    setTimeout(() => {
      fetchCandidates();
    }, 0);
  };

  const handleDeleteCandidate = (id: number) => {
    setCandidateToDelete(id);
  };

  const confirmDeleteCandidate = async (id: number) => {
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/cv/candidates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setCandidates(candidates.filter(c => c.id !== id));
        if (viewCandidate?.id === id) setViewCandidate(null);
      } else {
        throw new Error('Failed to delete candidate');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete candidate');
    }
  };

  // Open Edit Modal & load states
  const openEditModal = (cand: CandidateProfile) => {
    setEditError(null);
    setEditCandidate(cand);
    setEditName(cand.full_name || '');
    setEditEmail(cand.email || '');
    setEditPhone(cand.phone || '');
    setEditLocation(cand.location || '');
    setEditSkillsStr(cand.skills ? cand.skills.join(', ') : '');
    setEditSummary(cand.specialty_summary || '');
    setEditSuitability(cand.suitability_suggestion || '');
    setEditHrNote(cand.hr_note || '');
    setEditIsStrong(cand.is_strong || false);
    setEditRoleId(cand.role_id || '');
    setEditLevelId(cand.level_id || '');
  };

  const handleSaveEdit = async () => {
    setEditError(null);
    if (!editName.trim()) {
      setEditError('Candidate Name is required');
      return;
    }
    if (!editEmail.trim()) {
      setEditError('Email Address is required');
      return;
    }
    try {
      const skillsArray = editSkillsStr.split(',').map(s => s.trim()).filter(Boolean);

      const updated = await api.put<any>(`/api/cv/candidates/${editCandidate!.id}`, {
        full_name: editName,
        email: editEmail,
        phone: editPhone,
        location: editLocation,
        skills: skillsArray,
        specialty_summary: editSummary,
        suitability_suggestion: editSuitability,
        hr_note: editHrNote,
        is_strong: editIsStrong,
        role_id: editRoleId ? Number(editRoleId) : null,
        level_id: editLevelId ? Number(editLevelId) : null
      });

      // Update in local state list
      const matchedRole = roles.find(r => r.id === updated.role_id);
      const matchedLvl = levels.find(l => l.id === updated.level_id);

      setCandidates(candidates.map(c => c.id === updated.id ? {
        ...updated,
        role_name: matchedRole ? matchedRole.name : 'Not Specified',
        level_name: matchedLvl ? matchedLvl.name : 'Not Specified'
      } : c));

      setEditCandidate(null);
    } catch (err: any) {
      setEditError(err.message || 'Failed to save changes');
    }
  };

  // Options lists
  const roleFilterOptions = [
    { value: '', label: 'All Roles' },
    ...roles.map(r => ({ value: r.id, label: r.name }))
  ];

  const levelFilterOptions = [
    { value: '', label: 'All Levels' },
    ...levels.map(l => ({ value: l.id, label: l.name }))
  ];

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

  const isFiltered = searchQuery !== '' || selectedRole !== '' || selectedLevel !== '' || selectedSkill !== '';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Candidates Database</h1>
        <p className="text-text-secondary text-sm">Browse, filter, and modify parsed candidate details.</p>
      </div>

      {/* Filters Card */}
      <Card className="mb-8 border border-border-main">
        <form onSubmit={handleSearchSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="sm:col-span-2 mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-1">Search Candidates</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, location, or resume text..."
                  className="w-full pl-10 pr-3 py-2 text-sm bg-input-bg border border-input-border text-text-primary rounded-input focus:outline-none focus:border-primary-500"
                />
                <Search className="absolute left-3 top-2.5 text-text-secondary/50" size={16} />
              </div>
            </div>

            <SelectField
              label="Job Role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              options={roleFilterOptions}
              className="mb-0!"
            />

            <SelectField
              label="Seniority Level"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              options={levelFilterOptions}
              className="mb-0!"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end mt-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <InputField
                label="Filter by Specific Skill"
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
                placeholder="e.g. Python"
                className="mb-0!"
              />
            </div>

            {isFiltered && (
              <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2 mb-4">
                <Button type="button" variant="secondary" onClick={handleResetFilters} className="py-2.5 px-4 flex gap-1 animate-fade-in">
                  <X size={16} /> Clear Filters
                </Button>
              </div>
            )}
          </div>
        </form>
      </Card>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-error text-sm font-semibold rounded-btn">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20">
          <p className="text-text-secondary font-semibold animate-pulse text-sm">Searching Candidates Database...</p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-text-secondary">
            Total Candidates Found: <span className="font-semibold text-text-primary">{candidates.length}</span>
          </div>

          {candidates.length === 0 ? (
            <div className="text-center py-20 bg-bg-card border border-border-main rounded-card p-6 flex flex-col items-center">
              <AlertCircle size={44} className="text-text-secondary/50 mb-2" />
              <h3 className="text-base font-semibold text-text-primary mb-1">No Profiles Matching Filters</h3>
              <p className="text-text-secondary text-sm max-w-sm">
                Try widening your search terms or adjusting the category filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {candidates.map((cand) => (
                <Card
                  key={cand.id}
                  className="hover:border-primary-500 hover:shadow-lg transition-all duration-300 flex flex-col justify-between relative"
                >
                  {cand.is_strong && (
                    <div className="absolute top-3 right-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 shadow-xs">
                      <Star size={10} className="fill-amber-500 text-amber-500" />
                      <span>Strong Candidate</span>
                    </div>
                  )}

                  <div className="pt-2">
                    <div className="flex justify-between items-start mb-3">
                      <div className="truncate pr-16">
                        <h3 className="font-bold text-text-primary text-lg leading-tight truncate">
                          {cand.full_name || 'No Name'}
                        </h3>
                        <p className="text-xs text-text-secondary font-medium mt-1 flex items-center gap-1">
                          <Mail size={12} /> {cand.email || 'No Email'}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-border-main pt-3 mt-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${getRoleBadgeColor(cand.role_name || '')}`}>
                          {cand.role_name}
                        </span>
                        {cand.level_name && (
                          <span className="bg-bg-page dark:bg-input-bg border border-border-main text-text-secondary text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                            {cand.level_name}
                          </span>
                        )}
                      </div>

                      {cand.phone && (
                        <p className="text-xs text-text-secondary flex items-center gap-1.5">
                          <Phone size={13} /> {cand.phone}
                        </p>
                      )}

                      {cand.location && (
                        <p className="text-xs text-text-secondary flex items-center gap-1.5">
                          <MapPin size={13} className="text-text-secondary/50" /> {cand.location}
                        </p>
                      )}
                    </div>

                    {cand.specialty_summary && (
                      <p className="text-xs text-text-secondary italic mt-3 line-clamp-2 leading-relaxed">
                        "{cand.specialty_summary}"
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-1.5 max-h-16 overflow-hidden">
                      {cand.skills && cand.skills.slice(0, 5).map((s: string, idx: number) => (
                        <span key={idx} className="bg-bg-page dark:bg-input-bg border border-border-main text-text-secondary text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          {s}
                        </span>
                      ))}
                      {cand.skills && cand.skills.length > 5 && (
                        <span className="text-text-secondary/50 text-[10px] font-semibold px-1 py-0.5">
                          +{cand.skills.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-border-main pt-3 mt-4 flex gap-2 shrink-0">
                    <Button variant="secondary" className="flex-1 py-1 px-2.5 text-xs flex gap-1" onClick={() => { setViewCandidate(cand); setActiveTab('profile'); }}>
                      <Eye size={12} /> View
                    </Button>
                    <Button variant="secondary" className="flex-1 py-1 px-2.5 text-xs flex gap-1" onClick={() => openEditModal(cand)}>
                      <Edit size={12} /> Edit
                    </Button>
                    <Button variant="danger" className="py-1 px-2.5 text-xs" onClick={() => handleDeleteCandidate(cand.id)}>
                      <Trash size={12} />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-xs">
          <div className="bg-bg-card rounded-modal shadow-modal border border-border-main text-text-primary w-full max-w-2xl max-h-[75vh] md:max-h-[90vh] overflow-y-auto p-6 md:p-8 relative">
            <button onClick={() => setViewCandidate(null)} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary focus:outline-none">
              <X size={20} />
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border-main pb-4 mb-6 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-text-primary">{viewCandidate.full_name}</h2>
                  {viewCandidate.is_strong && (
                    <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs">
                      <Star size={11} className="fill-amber-500 text-amber-500" />
                      <span>Strong Candidate</span>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2.5">
                  <span className="text-xs text-text-secondary flex items-center gap-1">
                    <Mail size={13} /> {viewCandidate.email}
                  </span>
                  {viewCandidate.phone && (
                    <span className="text-xs text-text-secondary flex items-center gap-1">
                      <Phone size={13} /> {viewCandidate.phone}
                    </span>
                  )}
                  {viewCandidate.location && (
                    <span className="text-xs text-text-secondary flex items-center gap-1">
                      <MapPin size={13} className="text-text-secondary/50" /> {viewCandidate.location}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs px-3 py-1 rounded-full font-bold border uppercase whitespace-nowrap ${getRoleBadgeColor(viewCandidate.role_name || '')}`}>
                  {viewCandidate.role_name}
                </span>
                {viewCandidate.level_name && (
                  <span className="bg-bg-page dark:bg-input-bg border border-border-main text-text-secondary text-xs px-3 py-1 rounded-full font-semibold whitespace-nowrap">
                    {viewCandidate.level_name}
                  </span>
                )}
              </div>
            </div>

            {/* Tab Navigation */}
            {/* Dropdown for Mobile / Small Screens */}
            <div className="md:hidden mb-6 mt-2 relative">
              <label htmlFor="candidate-tab-select" className="sr-only">Select a tab</label>
              <select
                id="candidate-tab-select"
                value={activeTab}
                onChange={handleTabSelectChange}
                onClick={handleTabSelectClick}
                onBlur={handleTabSelectBlur}
                className="w-full pl-3 pr-10 py-2 text-sm bg-input-bg border border-input-border text-text-primary rounded-input focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-blue-100/50 transition-all font-semibold appearance-none cursor-pointer"
              >
                <option value="profile">Profile & CV Details</option>
                <option value="twin">AI Digital Twin</option>
                <option value="interview">Interview Guide</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-secondary/60">
                <ChevronDown 
                  size={16} 
                  className={`transition-transform duration-200 ${isTabSelectOpen ? 'rotate-180' : 'rotate-0'}`}
                />
              </div>
            </div>

            {/* Horizontal Tabs for Medium and Larger Screens */}
            <div className="hidden md:flex border-b border-border-main mb-6 mt-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`py-2 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-all ${
                  activeTab === 'profile'
                    ? 'border-primary-500 text-primary-500 font-bold'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                Profile & CV Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('twin')}
                className={`py-2 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-all ${
                  activeTab === 'twin'
                    ? 'border-primary-500 text-primary-500 font-bold'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                AI Digital Twin
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('interview')}
                className={`py-2 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-all ${
                  activeTab === 'interview'
                    ? 'border-primary-500 text-primary-500 font-bold'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                Interview Guide
              </button>
            </div>

            {activeTab === 'profile' && (
              <div className="space-y-6 animate-fade-in">
                {/* Specialty summary */}
                {viewCandidate.specialty_summary && (
                  <div>
                    <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 border-b border-border-main pb-1 flex items-center gap-1">
                      Specialty Brief Summary
                    </h4>
                    <p className="text-sm text-text-primary leading-relaxed bg-input-bg p-4 rounded-lg border border-border-main whitespace-pre-wrap">
                      {viewCandidate.specialty_summary}
                    </p>
                  </div>
                )}

                {/* Suitability Suggestion */}
                {viewCandidate.suitability_suggestion && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-5">
                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1 leading-none">
                      AI Suitability Match Evaluation
                    </h4>
                    <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap font-medium">
                      {viewCandidate.suitability_suggestion}
                    </p>
                  </div>
                )}

                {/* HR Note */}
                {viewCandidate.hr_note && (
                  <div>
                    <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 border-b border-border-main pb-1">
                      HR Assessment & Hiring Note
                    </h4>
                    <p className="text-sm text-text-primary leading-relaxed bg-blue-500/10 p-4 rounded-lg border border-blue-500/20 whitespace-pre-wrap">
                      {viewCandidate.hr_note}
                    </p>
                  </div>
                )}

                {/* Skills */}
                <div>
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-3 border-b border-border-main pb-1">
                    Skills Inventory
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {viewCandidate.skills.map((s: string, idx: number) => (
                      <span key={idx} className="bg-primary-500/10 text-primary-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-primary-500/20">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* CV File Ref */}
                {viewCandidate.cv_file_path && (
                  <div className="pt-2">
                    <div className="p-3 border border-border-main rounded-card bg-input-bg/50 flex justify-between items-center text-xs">
                      <span className="text-text-secondary font-semibold flex items-center gap-1.5">
                        <FileText size={14} className="text-primary-500" />
                        <span>Local CV Reference: {viewCandidate.cv_file_path.split('\\').pop()?.split('/').pop()}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'twin' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center bg-input-bg p-4 rounded-lg border border-border-main gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                      AI Career Twin Insights
                    </h4>
                    <p className="text-xs text-text-primary font-semibold">
                      Last Updated: {viewCandidate.digital_twin ? new Date(viewCandidate.digital_twin.updated_at).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                  <Button 
                    variant="secondary" 
                    onClick={() => handleRegenerateTwin(viewCandidate.id)}
                    disabled={regeneratingTwin}
                    className="flex gap-2 items-center text-xs font-semibold py-1.5 px-3 shrink-0"
                  >
                    <RefreshCw size={12} className={regeneratingTwin ? 'animate-spin' : ''} />
                    {regeneratingTwin ? 'Regenerating...' : 'Regenerate AI Twin'}
                  </Button>
                </div>

                {viewCandidate.digital_twin ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Prediction Summary */}
                      <div className="bg-primary-500/5 border border-border-main p-4 rounded-lg">
                        <h5 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                          Seniority Prediction
                        </h5>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-bold text-text-primary">
                            {viewCandidate.digital_twin.predicted_level || 'Not Evaluated'}
                          </span>
                          {viewCandidate.digital_twin.level_confidence !== null && (
                            <span className="text-xs text-text-secondary font-medium">
                              ({viewCandidate.digital_twin.level_confidence}% confidence)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Growth Potential */}
                      <div className="bg-primary-500/5 border border-border-main p-4 rounded-lg">
                        <h5 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                          Growth Potential
                        </h5>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-xl font-bold ${
                            viewCandidate.digital_twin.growth_potential === 'High' ? 'text-emerald-500' :
                            viewCandidate.digital_twin.growth_potential === 'Medium' ? 'text-amber-500' : 'text-rose-500'
                          }`}>
                            {viewCandidate.digital_twin.growth_potential || 'Not Evaluated'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Growth Reasoning */}
                    {viewCandidate.digital_twin.growth_reasoning && (
                      <div>
                        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 border-b border-border-main pb-1">
                          Growth & Potential Evaluation
                        </h4>
                        <p className="text-sm text-text-primary bg-input-bg p-4 rounded-lg border border-border-main leading-relaxed">
                          {viewCandidate.digital_twin.growth_reasoning}
                        </p>
                      </div>
                    )}

                    {/* Predicted Roles */}
                    {viewCandidate.digital_twin.predicted_roles && viewCandidate.digital_twin.predicted_roles.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 border-b border-border-main pb-1">
                          Predicted Fit Roles
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {viewCandidate.digital_twin.predicted_roles.map((role, idx) => (
                            <span key={idx} className="bg-bg-page border border-border-main text-text-primary text-xs font-medium px-3 py-1 rounded-full">
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key Strengths */}
                    {viewCandidate.digital_twin.strengths_analysis && viewCandidate.digital_twin.strengths_analysis.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-3 border-b border-border-main pb-1">
                          Core Strengths Analysis
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {viewCandidate.digital_twin.strengths_analysis.map((strength, idx) => (
                            <div key={idx} className="border border-border-main bg-input-bg/55 p-4 rounded-lg">
                              <h5 className="font-semibold text-sm text-text-primary mb-1.5 flex items-center gap-1.5">
                                <Brain size={14} className="text-primary-500" />
                                {strength.title}
                              </h5>
                              <p className="text-xs text-text-secondary leading-relaxed">
                                {strength.rationale}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Hidden Skills */}
                    {viewCandidate.digital_twin.hidden_skills && viewCandidate.digital_twin.hidden_skills.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-3 border-b border-border-main pb-1">
                          Inferred / Hidden Skills
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {viewCandidate.digital_twin.hidden_skills.map((skillObj, idx) => (
                            <div key={idx} className="border border-border-main bg-input-bg/55 p-4 rounded-lg">
                              <h5 className="font-semibold text-sm text-text-primary mb-1.5 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                                {skillObj.skill}
                              </h5>
                              <p className="text-xs text-text-secondary leading-relaxed">
                                {skillObj.reasoning}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended Career Directions */}
                    {viewCandidate.digital_twin.recommended_paths && viewCandidate.digital_twin.recommended_paths.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 border-b border-border-main pb-1">
                          Recommended Career Paths
                        </h4>
                        <ul className="list-disc list-inside space-y-1.5 text-sm text-text-secondary pl-2 leading-relaxed">
                          {viewCandidate.digital_twin.recommended_paths.map((path, idx) => (
                            <li key={idx}>{path}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-10 bg-input-bg rounded-lg border border-border-main">
                    <p className="text-text-secondary text-sm mb-4">No AI Twin insights found for this candidate profile.</p>
                    <div className="flex justify-center">
                      <Button 
                        onClick={() => handleRegenerateTwin(viewCandidate.id)}
                        disabled={regeneratingTwin}
                        className="px-5 text-xs py-2"
                      >
                        {regeneratingTwin ? 'Generating AI Insights...' : 'Generate AI Digital Twin'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'interview' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-input-bg p-4 rounded-lg border border-border-main">
                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                    AI Interview Prep Guide
                  </h4>
                  <p className="text-xs text-text-secondary">
                    Personalized interview questions based on the candidate's unique CV background. Click the copy icon to copy a question.
                  </p>
                </div>

                {viewCandidate.digital_twin && viewCandidate.digital_twin.interview_questions ? (
                  <div className="space-y-6">
                    {/* Technical Questions */}
                    {viewCandidate.digital_twin.interview_questions.technical && viewCandidate.digital_twin.interview_questions.technical.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-3 border-b border-border-main pb-1 flex items-center gap-1.5">
                          <HelpCircle size={14} className="text-blue-500" />
                          Technical & Skill Probing Questions
                        </h4>
                        <div className="space-y-3">
                          {viewCandidate.digital_twin.interview_questions.technical.map((q, idx) => (
                            <div key={idx} className="flex justify-between items-start gap-3 bg-input-bg/40 border border-border-main p-3 rounded-lg hover:border-primary-500/50 transition-colors">
                              <p className="text-sm text-text-primary leading-relaxed">{q}</p>
                              <button 
                                onClick={() => handleCopyQuestion(q)}
                                className="text-text-secondary hover:text-text-primary shrink-0 transition-colors p-1"
                                title="Copy to clipboard"
                              >
                                {copiedQuestion === q ? <span className="text-[10px] text-emerald-500 font-bold uppercase">Copied!</span> : <Copy size={14} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Scenario Questions */}
                    {viewCandidate.digital_twin.interview_questions.scenario && viewCandidate.digital_twin.interview_questions.scenario.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-3 border-b border-border-main pb-1 flex items-center gap-1.5">
                          <HelpCircle size={14} className="text-amber-500" />
                          Scenario & Problem Solving Questions
                        </h4>
                        <div className="space-y-3">
                          {viewCandidate.digital_twin.interview_questions.scenario.map((q, idx) => (
                            <div key={idx} className="flex justify-between items-start gap-3 bg-input-bg/40 border border-border-main p-3 rounded-lg hover:border-primary-500/50 transition-colors">
                              <p className="text-sm text-text-primary leading-relaxed">{q}</p>
                              <button 
                                onClick={() => handleCopyQuestion(q)}
                                className="text-text-secondary hover:text-text-primary shrink-0 transition-colors p-1"
                                title="Copy to clipboard"
                              >
                                {copiedQuestion === q ? <span className="text-[10px] text-emerald-500 font-bold uppercase">Copied!</span> : <Copy size={14} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Behavioral Questions */}
                    {viewCandidate.digital_twin.interview_questions.behavioral && viewCandidate.digital_twin.interview_questions.behavioral.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-3 border-b border-border-main pb-1 flex items-center gap-1.5">
                          <HelpCircle size={14} className="text-emerald-500" />
                          Behavioral & Culture Fit Questions
                        </h4>
                        <div className="space-y-3">
                          {viewCandidate.digital_twin.interview_questions.behavioral.map((q, idx) => (
                            <div key={idx} className="flex justify-between items-start gap-3 bg-input-bg/40 border border-border-main p-3 rounded-lg hover:border-primary-500/50 transition-colors">
                              <p className="text-sm text-text-primary leading-relaxed">{q}</p>
                              <button 
                                onClick={() => handleCopyQuestion(q)}
                                className="text-text-secondary hover:text-text-primary shrink-0 transition-colors p-1"
                                title="Copy to clipboard"
                              >
                                {copiedQuestion === q ? <span className="text-[10px] text-emerald-500 font-bold uppercase">Copied!</span> : <Copy size={14} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-input-bg rounded-lg border border-border-main">
                    <p className="text-text-secondary text-sm">Generate the AI Digital Twin first to access the Interview Guide.</p>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-border-main pt-6 mt-8 flex justify-end">
              <Button onClick={() => setViewCandidate(null)} className="px-6 font-bold">Close Details</Button>
            </div>
          </div >
        </div >
      )}

      {/* EDIT MODAL */}
      {
        editCandidate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-xs">
            <div className="bg-bg-card rounded-modal shadow-modal border border-border-main text-text-primary w-full max-w-2xl max-h-[75vh] md:max-h-[90vh] overflow-y-auto p-6 md:p-8 relative">
              <button onClick={() => setEditCandidate(null)} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary focus:outline-none">
                <X size={20} />
              </button>

              <h2 className="text-xl font-bold text-text-primary mb-6 pb-2 border-b border-border-main animate-fade-in">
                Modify Candidate Profile
              </h2>

              {editError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-error text-xs font-semibold rounded-btn animate-fade-in">
                  {editError}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Candidate Full Name *" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                  <InputField label="Email Address *" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Contact Phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                  <InputField label="Location" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SelectField
                    label="Assign Job Role"
                    options={[{ value: '', label: 'Unassigned' }, ...roles.map(r => ({ value: r.id, label: r.name }))]}
                    value={editRoleId}
                    onChange={(e) => setEditRoleId(e.target.value)}
                  />

                  <SelectField
                    label="Seniority Level"
                    options={[{ value: '', label: 'Unassigned' }, ...levels.map(l => ({ value: l.id, label: l.name }))]}
                    value={editLevelId}
                    onChange={(e) => setEditLevelId(e.target.value)}
                  />
                </div>

                <InputField
                  label="Skills Tags (comma separated)"
                  value={editSkillsStr}
                  onChange={(e) => setEditSkillsStr(e.target.value)}
                  placeholder="React, Python, TypeScript..."
                />

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Specialty Brief Summary</label>
                  <textarea
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-input-bg border border-input-border text-text-primary rounded-input focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-2">
                  <label className="block text-xs font-bold text-blue-400 leading-none">AI Suitability Match Suggestion</label>
                  <textarea
                    value={editSuitability}
                    onChange={(e) => setEditSuitability(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-input-bg border border-blue-500/30 rounded-md focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-text-primary font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">HR Assessment Note</label>
                  <textarea
                    value={editHrNote}
                    onChange={(e) => setEditHrNote(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-input-bg border border-input-border text-text-primary rounded-input focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div>
                  <label className="inline-flex items-center gap-2 px-3 py-2 border border-border-main rounded bg-bg-card hover:bg-bg-page/50 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editIsStrong}
                      onChange={(e) => setEditIsStrong(e.target.checked)}
                      className="w-4 h-4 text-primary-600 bg-input-bg border border-input-border rounded focus:ring-primary-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-text-primary">Mark as Strong Candidate</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-border-main pt-4 mt-6 flex justify-end gap-2 shrink-0">
                <Button variant="secondary" onClick={() => setEditCandidate(null)} className="px-5 py-2 text-xs font-bold">Cancel</Button>
                <Button onClick={handleSaveEdit} className="px-6 py-2 text-xs font-bold">Save Modifications</Button>
              </div>
            </div>
          </div>
        )
      }

      <ConfirmModal
        isOpen={candidateToDelete !== null}
        title="Delete Candidate Profile"
        message="Are you sure you want to delete this candidate profile? This action is permanent."
        onConfirm={() => {
          if (candidateToDelete !== null) {
            confirmDeleteCandidate(candidateToDelete);
            setCandidateToDelete(null);
          }
        }}
        onCancel={() => setCandidateToDelete(null)}
      />
    </div >
  );
};
