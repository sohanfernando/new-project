import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Card, Button, InputField, ConfirmModal } from '../components/UIComponents';
import { Edit, Trash, X, Check, ShieldAlert, GripVertical } from 'lucide-react';

export const ManageLevels: React.FC = () => {
  const [levels, setLevels] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New Level Form
  const [newLevelName, setNewLevelName] = useState('');
  const [creating, setCreating] = useState(false);

  // Inline Edit states
  const [editingLevelId, setEditingLevelId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Drag and Drop states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newLevels = [...levels];
    const draggedItem = newLevels[draggedIndex];
    newLevels.splice(draggedIndex, 1);
    newLevels.splice(index, 0, draggedItem);
    setLevels(newLevels);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDrop = async () => {
    if (levels.length > 0) {
      try {
        await api.put('/api/levels/reorder', levels.map(l => l.id));
      } catch (err: any) {
        setError(err.message || 'Failed to save levels reordering in database.');
      }
    }
  };

  useEffect(() => {
    fetchLevels();
  }, []);

  const fetchLevels = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ id: number; name: string }[]>('/api/levels');
      setLevels(data);
    } catch (err: any) {
      setError('Failed to fetch seniority levels list');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLevelName.trim()) return;
    
    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const created = await api.post<{ id: number; name: string }>('/api/levels', {
        name: newLevelName
      });
      setLevels([...levels, created]);
      setNewLevelName('');
      setSuccess('Seniority level created successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to create level');
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (id: number, currentName: string) => {
    setEditingLevelId(id);
    setEditingName(currentName);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editingName.trim()) return;
    setError(null);
    setSuccess(null);

    try {
      const updated = await api.put<{ id: number; name: string }>(`/api/levels/${id}`, {
        name: editingName
      });
      setLevels(levels.map(l => l.id === id ? updated : l));
      setEditingLevelId(null);
      setSuccess('Seniority level updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update level');
    }
  };

  const handleDeleteLevel = (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteLevel = async (id: number) => {
    setError(null);
    setSuccess(null);

    try {
      // Direct DELETE request
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/levels/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setLevels(levels.filter(l => l.id !== id));
        setSuccess('Seniority level deleted successfully!');
      } else {
        const errorJson = await res.json();
        throw new Error(errorJson.detail || 'Delete failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete level');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Configure Seniority Levels</h1>
        <p className="text-text-secondary text-sm">Configure target seniority titles for candidate mapping and portal search filters.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-error text-sm font-semibold rounded-btn">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-success text-sm font-semibold rounded-btn">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Panel */}
        <div className="lg:col-span-1">
          <Card>
            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <ShieldAlert size={18} className="text-primary-500" />
              <span>Add New Level</span>
            </h3>
            
            <form onSubmit={handleCreateLevel}>
              <InputField
                label="Seniority Level Name"
                placeholder="e.g. Senior"
                value={newLevelName}
                onChange={(e) => setNewLevelName(e.target.value)}
              />
              <Button type="submit" fullWidth disabled={creating} className="mt-2">
                {creating ? 'Creating...' : 'Create Level'}
              </Button>
            </form>
          </Card>
        </div>

        {/* Levels List */}
        <div className="lg:col-span-2">
          <Card>
            <h3 className="text-lg font-bold text-text-primary mb-4 pb-2 border-b border-border-main">Configured Seniority Levels</h3>
            
            {loading ? (
              <p className="text-sm text-text-secondary animate-pulse">Loading levels...</p>
            ) : levels.length === 0 ? (
              <p className="text-sm text-text-secondary/60 py-6 text-center">No seniority levels created yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-bg-page/50 text-text-secondary font-semibold border-b border-border-main">
                      <th className="py-2.5 px-2 w-10"></th>
                      <th className="py-2.5 px-4">Level ID</th>
                      <th className="py-2.5 px-4">Level Name</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levels.map((level, index) => (
                      <tr 
                        key={level.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        onDrop={handleDrop}
                        className={`border-b border-border-main hover:bg-bg-page/30 transition-all duration-150 ${
                          draggedIndex === index ? 'opacity-45 bg-primary-500/10 border-t-2 border-primary-500 scale-[0.995] shadow-xs' : ''
                        }`}
                      >
                        <td className="py-3 px-2 text-text-secondary/35 cursor-grab active:cursor-grabbing select-none w-10">
                          <GripVertical size={16} />
                        </td>
                        <td className="py-3 px-4 text-text-secondary/50 font-mono text-xs">{level.id}</td>
                        <td className="py-3 px-4">
                          {editingLevelId === level.id ? (
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="px-2 py-1 text-sm bg-input-bg border border-input-border text-text-primary rounded focus:outline-none focus:border-primary-500 w-full max-w-xs"
                            />
                          ) : (
                            <span className="font-semibold text-text-primary">{level.name}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {editingLevelId === level.id ? (
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleSaveEdit(level.id)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-full"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => setEditingLevelId(null)}
                                className="p-1.5 text-text-secondary hover:bg-bg-page rounded-full"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => handleStartEdit(level.id, level.name)}
                                className="p-1.5 text-text-secondary hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-full"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteLevel(level.id)}
                                className="p-1.5 text-text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full"
                              >
                                <Trash size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title="Delete Seniority Level"
        message="Are you sure you want to delete this seniority level? Candidates linked to it will be set to Unassigned."
        onConfirm={() => {
          if (deleteConfirmId !== null) {
            confirmDeleteLevel(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
};
