import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors, DragOverlay, closestCenter,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useFormStore } from '../../stores/formStore';
import { FieldPalette } from '../../components/FormBuilder/FieldPalette';
import { FieldCard } from '../../components/FormBuilder/FieldCard';
import { PropertiesPanel } from '../../components/FormBuilder/PropertiesPanel';
import api from '../../lib/api';
import type { FormField } from '@form-builder/shared';

export function FormBuilderPage() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const { fields, name, description, settings, addField, removeField, moveField, setName, setDescription, setForm, isDirty } = useFormStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeType, setActiveType] = useState<FormField['type'] | null>(null);
  const [formStatus, setFormStatus] = useState('draft');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    if (formId) {
      api.get(`/forms/${formId}`).then((r) => {
        setForm({ id: formId, name: r.data.name, description: r.data.description, fields: r.data.fields, settings: r.data.settings });
        setFormStatus(r.data.status);
      });
    }
  }, [formId]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch(`/forms/${formId}`, { name, description, fields, settings });
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      await handleSave();
      await api.post(`/forms/${formId}/publish`);
      setFormStatus('published');
    } finally {
      setPublishing(false);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === 'palette') {
      setActiveType(event.active.data.current.fieldType);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveType(null);
    const { active, over } = event;
    if (!over) return;

    // Dropped from palette → add new field
    if (active.data.current?.type === 'palette') {
      addField(active.data.current.fieldType);
      return;
    }

    // Reorder existing fields
    const fromIdx = fields.findIndex((f) => f.id === active.id);
    const toIdx = fields.findIndex((f) => f.id === over.id);
    if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
      moveField(fromIdx, toIdx);
    }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shrink-0">
        <button onClick={() => navigate('/dashboard/forms')} className="btn btn-ghost text-sm">
          ← Back
        </button>

        <div className="flex-1 min-w-0">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-lg font-semibold text-gray-900 bg-transparent border-none outline-none focus:underline w-full"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isDirty && <span className="text-xs text-gray-400">Unsaved changes</span>}
          <span className={`badge ${formStatus === 'published' ? 'badge-green' : 'badge-gray'}`}>
            {formStatus}
          </span>
          <button onClick={handleSave} disabled={saving} className="btn btn-secondary text-sm">
            {saving ? 'Saving…' : 'Save'}
          </button>
          {formStatus !== 'published' && (
            <button onClick={handlePublish} disabled={publishing} className="btn btn-primary text-sm">
              {publishing ? 'Publishing…' : 'Publish'}
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <FieldPalette />

          {/* Canvas */}
          <main className="flex-1 overflow-auto bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto space-y-3">
              {/* Form header */}
              <div className="card p-6 mb-6">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-2xl font-bold text-gray-900 w-full border-none outline-none bg-transparent"
                  placeholder="Form title"
                />
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-sm text-gray-500 w-full border-none outline-none bg-transparent mt-2"
                  placeholder="Form description (optional)"
                />
              </div>

              <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                {fields.map((field) => (
                  <FieldCard
                    key={field.id}
                    field={field}
                    isSelected={selectedId === field.id}
                    onSelect={() => setSelectedId(field.id)}
                    onRemove={() => {
                      removeField(field.id);
                      if (selectedId === field.id) setSelectedId(null);
                    }}
                  />
                ))}
              </SortableContext>

              {fields.length === 0 && (
                <div className="card p-16 text-center border-2 border-dashed border-gray-200">
                  <p className="text-4xl mb-3">⬅️</p>
                  <p className="text-gray-500 font-medium">Drag fields from the left panel</p>
                  <p className="text-gray-400 text-sm mt-1">or click any field type to add it</p>
                </div>
              )}
            </div>
          </main>

          <DragOverlay>
            {activeType && (
              <div className="bg-white border-2 border-blue-500 rounded-xl p-4 shadow-xl opacity-90 text-sm font-medium text-blue-700">
                + {activeType}
              </div>
            )}
          </DragOverlay>
        </DndContext>

        <PropertiesPanel fieldId={selectedId} />
      </div>
    </div>
  );
}
