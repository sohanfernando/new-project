import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Card, Button, InputField, ConfirmModal } from '../components/UIComponents';
import { Edit, Trash, X, Check, Award, GripVertical } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const ManageRoles: React.FC = () => {
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New Role Form
  const [newRoleName, setNewRoleName] = useState('');
  const [creating, setCreating] = useState(false);

  // Inline Edit states
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
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
    const newRoles = [...roles];
    const draggedItem = newRoles[draggedIndex];
    newRoles.splice(draggedIndex, 1);
    newRoles.splice(index, 0, draggedItem);
    setRoles(newRoles);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDrop = async () => {
    if (roles.length > 0) {
      try {
        await api.put('/api/roles/reorder', roles.map(r => r.id));
      } catch (err: any) {
        setError(err.message || 'Failed to save roles reordering in database.');
      }
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ id: number; name: string }[]>('/api/roles');
      setRoles(data);
    } catch (err: any) {
      setError('Failed to fetch job roles list');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    
    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const created = await api.post<{ id: number; name: string }>('/api/roles', {
        name: newRoleName
      });
      setRoles([...roles, created]);
      setNewRoleName('');
      setSuccess('Job role created successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to create role');
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (id: number, currentName: string) => {
    setEditingRoleId(id);
    setEditingName(currentName);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editingName.trim()) return;
    setError(null);
    setSuccess(null);

    try {
      const updated = await api.put<{ id: number; name: string }>(`/api/roles/${id}`, {
        name: editingName
      });
      setRoles(roles.map(r => r.id === id ? updated : r));
      setEditingRoleId(null);
      setSuccess('Job role updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    }
  };

  const handleDeleteRole = (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteRole = async (id: number) => {
    setError(null);
    setSuccess(null);

    try {
      // Direct DELETE request
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/roles/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setRoles(roles.filter(r => r.id !== id));
        setSuccess('Job role deleted successfully!');
      } else {
        const errorJson = await res.json();
        throw new Error(errorJson.detail || 'Delete failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete role');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Configure Job Roles</h1>
        <p className="text-text-secondary text-sm">Configure target professions for candidate mapping and portal search indices.</p>
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
              <Award size={18} className="text-primary-500" />
              <span>Add New Role</span>
            </h3>
            
            <form onSubmit={handleCreateRole}>
              <InputField
                label="Role Title Name"
                placeholder="e.g. Software Engineer"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
              <Button type="submit" fullWidth disabled={creating} className="mt-2">
                {creating ? 'Creating...' : 'Create Role'}
              </Button>
            </form>
          </Card>
        </div>

        {/* Roles List */}
        <div className="lg:col-span-2">
          <Card>
            <h3 className="text-lg font-bold text-text-primary mb-4 pb-2 border-b border-border-main">Configured System Roles</h3>
            
            {loading ? (
              <p className="text-sm text-text-secondary animate-pulse">Loading roles...</p>
            ) : roles.length === 0 ? (
              <p className="text-sm text-text-secondary/60 py-6 text-center">No job roles created yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-bg-page/50 text-text-secondary font-semibold border-b border-border-main">
                      <th className="py-2.5 px-2 w-10"></th>
                      <th className="py-2.5 px-4">Role ID</th>
                      <th className="py-2.5 px-4">Role Name</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role, index) => (
                      <tr 
                        key={role.id} 
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
                        <td className="py-3 px-4 text-text-secondary/50 font-mono text-xs">{role.id}</td>
                        <td className="py-3 px-4">
                          {editingRoleId === role.id ? (
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="px-2 py-1 text-sm bg-input-bg border border-input-border text-text-primary rounded focus:outline-none focus:border-primary-500 w-full max-w-xs"
                            />
                          ) : (
                            <span className="font-semibold text-text-primary">{role.name}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {editingRoleId === role.id ? (
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleSaveEdit(role.id)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-full"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => setEditingRoleId(null)}
                                className="p-1.5 text-text-secondary hover:bg-bg-page rounded-full"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => handleStartEdit(role.id, role.name)}
                                className="p-1.5 text-text-secondary hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-full"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteRole(role.id)}
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
        title="Delete Job Role"
        message="Are you sure you want to delete this job role? Candidates linked to it will be set to Unassigned."
        onConfirm={() => {
          if (deleteConfirmId !== null) {
            confirmDeleteRole(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
};
