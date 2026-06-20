import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { FormField } from '@form-builder/shared';
import { apiBase } from '../../lib/api';

const s = (path: string) => `${apiBase}${path}`;

type PageStatus = 'loading' | 'gate' | 'form' | 'submitted' | 'error' | 'expired';

export function StandaloneFormPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [status, setStatus] = useState<PageStatus>('loading');
  const [formData, setFormData] = useState<any>(null);
  const [sessionToken, setSessionToken] = useState('');
  const [error, setError] = useState('');
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmationId, setConfirmationId] = useState('');
  const [requiredAction, setRequiredAction] = useState('');

  useEffect(() => {
    if (!shortCode) return;
    fetch(s(`/s/${shortCode}/status`))
      .then((r) => r.json())
      .then((d) => {
        if (!d.active) {
          setStatus('expired');
          return;
        }
        if (d.requiresAuth) {
          setStatus('gate');
          setRequiredAction(d.requiredAction || 'password');
          return;
        }
        loadForm();
      })
      .catch(() => { setStatus('error'); setError('Could not load form.'); });
  }, [shortCode]);

  async function loadForm() {
    const res = await fetch(s(`/s/${shortCode}`));
    if (!res.ok) { setStatus('error'); return; }
    const data = await res.json();
    setFormData(data.form);
    if (data.sessionToken) setSessionToken(data.sessionToken);
    setStatus('form');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(s(`/s/${shortCode}/submit`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Token': sessionToken },
        body: JSON.stringify({ values }),
      });
      const result = await res.json();
      if (result.success) {
        setConfirmationId(result.confirmationId);
        setStatus('submitted');
        if (result.redirectUrl) {
          setTimeout(() => { window.location.href = result.redirectUrl; }, 3000);
        }
      } else if (result.code === 'FORM_UPDATED') {
        alert('This form has been updated. Reloading…');
        window.location.reload();
      } else {
        setError(result.errors?.join(', ') || result.message || 'Submission failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleFieldChange(fieldId: string, value: unknown) {
    setValues((v) => ({ ...v, [fieldId]: value }));
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <CenterCard>
        <p className="text-4xl mb-4">⏰</p>
        <h1 className="text-xl font-bold text-gray-900">Link Expired</h1>
        <p className="text-gray-500 mt-2 text-sm">This form link is no longer active. Contact the organizer for a new link.</p>
      </CenterCard>
    );
  }

  if (status === 'error') {
    return (
      <CenterCard>
        <p className="text-4xl mb-4">⚠️</p>
        <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
        <p className="text-gray-500 mt-2 text-sm">{error}</p>
      </CenterCard>
    );
  }

  if (status === 'gate') {
    return <AccessGate shortCode={shortCode!} requiredAction={requiredAction} onGranted={(token) => { setSessionToken(token); loadForm(); }} />;
  }

  if (status === 'submitted') {
    return (
      <CenterCard>
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Response submitted!</h1>
        <p className="text-gray-500 mt-2 text-sm">
          {formData?.settings?.confirmationMessage || 'Thank you for your response!'}
        </p>
        {confirmationId && (
          <p className="text-xs text-gray-400 mt-4">Confirmation ID: {confirmationId}</p>
        )}
      </CenterCard>
    );
  }

  // Form
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-4">
        {/* Header */}
        <div className="card p-6">
          <h1 className="text-2xl font-bold text-gray-900">{formData?.name}</h1>
          {formData?.description && <p className="text-gray-600 mt-2 text-sm">{formData.description}</p>}
        </div>

        {/* Fields */}
        {(formData?.fields || []).map((field: FormField) => (
          <div key={field.id} className="card p-5">
            <label className="label">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.properties.helpText && (
              <p className="text-xs text-gray-400 mb-2">{field.properties.helpText}</p>
            )}
            <FormFieldInput
              field={field}
              value={values[field.id]}
              onChange={(v) => handleFieldChange(field.id, v)}
            />
          </div>
        ))}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary w-full py-3 text-base"
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>

        <p className="text-center text-xs text-gray-400">
          Powered by <a href="/" className="hover:underline">Form Builder</a>
        </p>
      </form>
    </div>
  );
}

function FormFieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const str = (value as string) || '';

  switch (field.type) {
    case 'textarea':
      return <textarea className="input resize-none" rows={4} value={str} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} required={field.required} />;
    case 'select':
      return (
        <select className="input" value={str} onChange={(e) => onChange(e.target.value)} required={field.required}>
          <option value="">Choose…</option>
          {field.properties.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case 'radio':
      return (
        <div className="space-y-2">
          {field.properties.options?.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name={field.id} value={o.value} checked={str === o.value} onChange={() => onChange(o.value)} required={field.required} />
              {o.label}
            </label>
          ))}
        </div>
      );
    case 'checkbox':
      return (
        <div className="space-y-2">
          {field.properties.options?.map((o) => {
            const arr = (value as string[]) || [];
            return (
              <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={arr.includes(o.value)}
                  onChange={(e) => {
                    if (e.target.checked) onChange([...arr, o.value]);
                    else onChange(arr.filter((v) => v !== o.value));
                  }}
                />
                {o.label}
              </label>
            );
          })}
        </div>
      );
    case 'date':
      return <input className="input" type="date" value={str} onChange={(e) => onChange(e.target.value)} required={field.required} />;
    case 'time':
      return <input className="input" type="time" value={str} onChange={(e) => onChange(e.target.value)} required={field.required} />;
    case 'number':
      return <input className="input" type="number" value={str} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} required={field.required} />;
    case 'email':
      return <input className="input" type="email" value={str} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder || 'you@example.com'} required={field.required} />;
    case 'phone':
      return <input className="input" type="tel" value={str} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder || '+1 (555) 000-0000'} required={field.required} />;
    case 'file':
      return <input className="input py-1.5" type="file" onChange={(e) => onChange(e.target.files?.[0]?.name)} required={field.required} />;
    case 'rating':
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => onChange(n)} className={`text-2xl transition-colors ${Number(value) >= n ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}>★</button>
          ))}
        </div>
      );
    default:
      return <input className="input" type="text" value={str} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} required={field.required} />;
  }
}

function AccessGate({
  shortCode,
  requiredAction,
  onGranted,
}: {
  shortCode: string;
  requiredAction: string;
  onGranted: (token: string) => void;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const body = requiredAction === 'password' ? { password: value } : { email: value };
    const res = await fetch(s(`/s/${shortCode}/access`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    if (result.success) {
      onGranted(result.sessionToken);
    } else {
      setError(result.error || 'Access denied');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <p className="text-3xl mb-2">{requiredAction === 'password' ? '🔒' : '✉️'}</p>
          <h1 className="text-lg font-bold">Access Required</h1>
          <p className="text-sm text-gray-500 mt-1">
            {requiredAction === 'password'
              ? 'Enter the password to access this form'
              : 'Enter your email address to continue'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="input"
            type={requiredAction === 'password' ? 'password' : 'email'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={requiredAction === 'password' ? 'Password' : 'your@email.com'}
            required
            autoFocus
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Verifying…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

function CenterCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card p-10 text-center max-w-sm w-full">{children}</div>
    </div>
  );
}
