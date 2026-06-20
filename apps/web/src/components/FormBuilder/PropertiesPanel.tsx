import { useState } from 'react';
import type { FormField } from '@form-builder/shared';
import { useFormStore } from '../../stores/formStore';

export function PropertiesPanel({ fieldId }: { fieldId: string | null }) {
  const { fields, updateField, settings, updateSettings } = useFormStore();
  const field = fields.find((f) => f.id === fieldId);

  if (!field) {
    return (
      <aside className="w-72 bg-white border-l border-gray-200 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Properties</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <p className="text-sm text-gray-400">Select a field to edit its properties</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-72 bg-white border-l border-gray-200 flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Field Properties</p>
        <p className="text-xs text-blue-600 mt-0.5 capitalize">{field.type}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Label */}
        <div>
          <label className="label">Label</label>
          <input
            className="input"
            value={field.label}
            onChange={(e) => updateField(field.id, { label: e.target.value })}
          />
        </div>

        {/* Placeholder */}
        {['text', 'textarea', 'email', 'phone', 'number'].includes(field.type) && (
          <div>
            <label className="label">Placeholder</label>
            <input
              className="input"
              value={field.placeholder || ''}
              onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
            />
          </div>
        )}

        {/* Required */}
        <div className="flex items-center justify-between">
          <label className="label mb-0">Required</label>
          <button
            onClick={() => updateField(field.id, { required: !field.required })}
            className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
              field.required ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${
              field.required ? 'translate-x-4' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Width */}
        <div>
          <label className="label">Width</label>
          <div className="flex gap-1">
            {(['full', 'half', 'third'] as const).map((w) => (
              <button
                key={w}
                onClick={() => updateField(field.id, { layout: { ...field.layout, width: w } })}
                className={`flex-1 py-1.5 text-xs rounded border font-medium transition-colors ${
                  field.layout.width === w
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Options (for radio/select/checkbox) */}
        {['radio', 'select', 'checkbox', 'multiselect'].includes(field.type) && (
          <OptionsEditor field={field} onUpdate={(updates) => updateField(field.id, updates)} />
        )}

        {/* Help text */}
        <div>
          <label className="label">Help text</label>
          <input
            className="input"
            value={field.properties.helpText || ''}
            onChange={(e) =>
              updateField(field.id, { properties: { ...field.properties, helpText: e.target.value } })
            }
            placeholder="Optional hint for the user"
          />
        </div>
      </div>
    </aside>
  );
}

function OptionsEditor({
  field,
  onUpdate,
}: {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
}) {
  const options = field.properties.options || [];

  function addOption() {
    onUpdate({
      properties: {
        ...field.properties,
        options: [...options, { label: `Option ${options.length + 1}`, value: `option_${options.length + 1}` }],
      },
    });
  }

  function updateOption(index: number, label: string) {
    const next = options.map((o, i) =>
      i === index ? { label, value: label.toLowerCase().replace(/\s+/g, '_') } : o,
    );
    onUpdate({ properties: { ...field.properties, options: next } });
  }

  function removeOption(index: number) {
    onUpdate({ properties: { ...field.properties, options: options.filter((_, i) => i !== index) } });
  }

  return (
    <div>
      <label className="label">Options</label>
      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <div key={i} className="flex gap-1">
            <input
              className="input flex-1 text-xs py-1.5"
              value={opt.label}
              onChange={(e) => updateOption(i, e.target.value)}
            />
            <button
              onClick={() => removeOption(i)}
              className="px-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              ×
            </button>
          </div>
        ))}
        <button onClick={addOption} className="btn btn-ghost text-xs w-full border border-dashed border-gray-300">
          + Add option
        </button>
      </div>
    </div>
  );
}
