import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../lib/api';
import type { Shortlink } from '@form-builder/shared';

function formatDate(d?: string | Date | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

const ACCESS_LABELS: Record<string, string> = {
  public: 'Public',
  password: 'Password',
  email_list: 'Email restricted',
  token: 'Token',
  rate_limited: 'Rate limited',
};

export function ShortlinksPage() {
  const [shortlinks, setShortlinks] = useState<Shortlink[]>([]);
  const [forms, setForms] = useState<{ id: string; name: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<Shortlink | null>(null);
  const [qrTarget, setQrTarget] = useState<Shortlink | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/shortlinks'),
      api.get('/forms'),
    ]).then(([sl, f]) => {
      setShortlinks(sl.data);
      setForms(f.data);
    }).finally(() => setLoading(false));
  }, []);

  async function handleSwitchForm(sl: Shortlink, newFormId: string, reason: string) {
    await api.post(`/shortlinks/${sl.shortCode}/switch`, { newFormId, reason });
    const updated = await api.get('/shortlinks');
    setShortlinks(updated.data);
    setSwitchTarget(null);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Smart Shortlinks</h1>
          <p className="text-gray-500 text-sm mt-1">Same URL, switchable form target</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Shortlink
        </button>
      </div>

      {shortlinks.length === 0 ? (
        <div className="card p-16 text-center">
          <p className="text-4xl mb-3">🔗</p>
          <p className="text-gray-500 font-medium">No shortlinks yet</p>
          <p className="text-gray-400 text-sm mt-1">Create a shortlink to share a form with a memorable URL</p>
          <button className="btn btn-primary mt-4" onClick={() => setShowCreate(true)}>Create Shortlink</button>
        </div>
      ) : (
        <div className="space-y-4">
          {shortlinks.map((sl) => (
            <ShortlinkCard
              key={sl.id}
              shortlink={sl}
              onSwitchForm={() => setSwitchTarget(sl)}
              onQrCode={() => setQrTarget(sl)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateShortlinkModal
          forms={forms.filter((f) => f.status === 'published')}
          onClose={() => setShowCreate(false)}
          onCreate={async (data) => {
            await api.post('/shortlinks', data);
            const updated = await api.get('/shortlinks');
            setShortlinks(updated.data);
            setShowCreate(false);
          }}
        />
      )}

      {switchTarget && (
        <SwitchFormModal
          shortlink={switchTarget}
          forms={forms.filter((f) => f.status === 'published')}
          onClose={() => setSwitchTarget(null)}
          onSwitch={handleSwitchForm}
        />
      )}

      {qrTarget && (
        <QrModal shortlink={qrTarget} onClose={() => setQrTarget(null)} />
      )}
    </div>
  );
}

// ─── ShortlinkCard ────────────────────────────────────────────

function ShortlinkCard({
  shortlink: sl,
  onSwitchForm,
  onQrCode,
}: {
  shortlink: Shortlink;
  onSwitchForm: () => void;
  onQrCode: () => void;
}) {
  const url = `${window.location.origin}/s/${sl.shortCode}`;
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="card p-5">
      <div className="flex items-start gap-5">
        <div className="flex-1 min-w-0">
          {/* Code + badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono font-bold text-blue-600 text-lg">/s/{sl.shortCode}</span>
            <button onClick={copy} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
            <span className={`badge ${sl.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{sl.status}</span>
            {sl.accessType !== 'public' && (
              <span className="badge badge-yellow">{ACCESS_LABELS[sl.accessType]}</span>
            )}
          </div>

          <p className="text-xs text-gray-400 mb-3">
            {sl.totalClicks} clicks · {sl.currentForm?.responseCount ?? 0} responses
            {sl.expiresAt && ` · Expires ${formatDate(sl.expiresAt)}`}
          </p>

          {/* Current form */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-0.5">Current Form</p>
                <p className="font-medium text-gray-900">{sl.currentForm?.name || '—'}</p>
              </div>
              <button className="btn btn-secondary text-xs" onClick={onSwitchForm}>
                Switch Form
              </button>
            </div>
          </div>

          {/* History */}
          {(sl.history?.length ?? 0) > 1 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">History</p>
              <div className="space-y-1">
                {sl.history!.slice(1).map((h) => (
                  <div key={h.id} className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="text-gray-300">→</span>
                    <span>{h.form?.name || h.formId}</span>
                    <span className="text-gray-300">
                      {formatDate(h.activatedAt)} – {h.deactivatedAt ? formatDate(h.deactivatedAt) : 'active'}
                    </span>
                    {h.reason && (
                      <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{h.reason}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* QR + actions */}
        <div className="shrink-0 flex flex-col items-center gap-2">
          <button onClick={onQrCode} title="View QR code">
            <QRCodeSVG value={url} size={80} className="rounded" />
          </button>
          <button onClick={onQrCode} className="btn btn-ghost text-xs">QR Code</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────

function CreateShortlinkModal({
  forms,
  onClose,
  onCreate,
}: {
  forms: { id: string; name: string }[];
  onClose: () => void;
  onCreate: (data: any) => Promise<void>;
}) {
  const [formId, setFormId] = useState(forms[0]?.id || '');
  const [customCode, setCustomCode] = useState('');
  const [accessType, setAccessType] = useState('public');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    try {
      await onCreate({ formId, customCode: customCode || undefined, accessType });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Create Shortlink" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="label">Form</label>
          <select className="input" value={formId} onChange={(e) => setFormId(e.target.value)}>
            {forms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          {forms.length === 0 && <p className="text-xs text-red-500 mt-1">Publish a form first</p>}
        </div>
        <div>
          <label className="label">Custom code (optional)</label>
          <input
            className="input font-mono uppercase"
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
            placeholder="ABSENRENTEK (leave blank to auto-generate)"
          />
        </div>
        <div>
          <label className="label">Access type</label>
          <select className="input" value={accessType} onChange={(e) => setAccessType(e.target.value)}>
            <option value="public">Public (anyone with link)</option>
            <option value="password">Password protected</option>
            <option value="email_list">Email domain restricted</option>
            <option value="token">Access token</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !formId}>
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SwitchFormModal({
  shortlink,
  forms,
  onClose,
  onSwitch,
}: {
  shortlink: Shortlink;
  forms: { id: string; name: string }[];
  onClose: () => void;
  onSwitch: (sl: Shortlink, newFormId: string, reason: string) => Promise<void>;
}) {
  const [newFormId, setNewFormId] = useState(forms[0]?.id || '');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSwitch() {
    setSaving(true);
    try {
      await onSwitch(shortlink, newFormId, reason || 'Manual switch');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Switch form for /s/${shortlink.shortCode}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-700">
          <strong>Current:</strong> {shortlink.currentForm?.name || shortlink.currentFormId}
          <br />
          The URL stays the same — only the target form changes.
        </div>
        <div>
          <label className="label">New form</label>
          <select className="input" value={newFormId} onChange={(e) => setNewFormId(e.target.value)}>
            {forms.filter((f) => f.id !== shortlink.currentFormId).map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Reason (for audit log)</label>
          <input
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Event sold out — switching to waitlist"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSwitch} disabled={saving || !newFormId}>
            {saving ? 'Switching…' : 'Switch Form'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function QrModal({ shortlink, onClose }: { shortlink: Shortlink; onClose: () => void }) {
  const url = `${window.location.origin}/s/${shortlink.shortCode}`;
  return (
    <Modal title={`QR Code — /s/${shortlink.shortCode}`} onClose={onClose}>
      <div className="flex flex-col items-center gap-4 py-2">
        <QRCodeSVG value={url} size={220} includeMargin />
        <p className="text-sm text-gray-500 text-center break-all">{url}</p>
        <button
          className="btn btn-secondary"
          onClick={() => {
            const svg = document.querySelector('svg') as SVGElement;
            const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `qr-${shortlink.shortCode}.svg`;
            a.click();
          }}
        >
          Download SVG
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
