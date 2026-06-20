import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

interface Form {
  id: string;
  name: string;
  description?: string;
  status: string;
  responseCount: number;
  updatedAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'badge badge-gray',
  published: 'badge badge-green',
  archived: 'badge badge-yellow',
  closed: 'badge badge-red',
};

export function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/forms').then((r) => setForms(r.data)).finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    const { data } = await api.post('/forms', { name: newName.trim() });
    navigate(`/dashboard/forms/${data.id}/builder`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forms</h1>
          <p className="text-gray-500 text-sm mt-1">{forms.length} form{forms.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Form
        </button>
      </div>

      {/* New form dialog */}
      {creating && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create New Form</h2>
            <label className="label">Form name</label>
            <input
              className="input"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Event Registration"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn btn-secondary" onClick={() => { setCreating(false); setNewName(''); }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={!newName.trim()}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {forms.length === 0 ? (
        <div className="card p-16 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500">No forms yet. Create your first form to get started.</p>
          <button className="btn btn-primary mt-4" onClick={() => setCreating(true)}>Create Form</button>
        </div>
      ) : (
        <div className="grid gap-3">
          {forms.map((form) => (
            <div key={form.id} className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-semibold text-gray-900 truncate">{form.name}</h2>
                  <span className={STATUS_BADGE[form.status] || 'badge badge-gray'}>{form.status}</span>
                </div>
                {form.description && (
                  <p className="text-sm text-gray-500 truncate">{form.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {form.responseCount} response{form.responseCount !== 1 ? 's' : ''} ·
                  Updated {new Date(form.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  className="btn btn-secondary text-xs"
                  onClick={() => navigate(`/dashboard/forms/${form.id}/builder`)}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
