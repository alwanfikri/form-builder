import { create } from 'zustand';
import type { FormField, FormSettings, FormLayout } from '@form-builder/shared';

const uuid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

interface FormStore {
  id: string | null;
  name: string;
  description: string;
  fields: FormField[];
  settings: Partial<FormSettings>;
  layout: Partial<FormLayout>;
  isDirty: boolean;

  setForm: (form: Partial<FormStore>) => void;
  addField: (type: FormField['type']) => void;
  updateField: (id: string, updates: Partial<FormField>) => void;
  removeField: (id: string) => void;
  moveField: (fromIndex: number, toIndex: number) => void;
  setName: (name: string) => void;
  setDescription: (desc: string) => void;
  updateSettings: (settings: Partial<FormSettings>) => void;
  reset: () => void;
}

const defaultField = (type: FormField['type']): FormField => ({
  id: uuid(),
  type,
  label: labelForType(type),
  required: false,
  properties: {},
  layout: { width: 'full', row: 0 },
});

function labelForType(type: FormField['type']): string {
  const map: Partial<Record<FormField['type'], string>> = {
    text: 'Short Answer',
    textarea: 'Long Answer',
    email: 'Email Address',
    phone: 'Phone Number',
    number: 'Number',
    date: 'Date',
    select: 'Dropdown',
    radio: 'Multiple Choice',
    checkbox: 'Checkboxes',
    file: 'File Upload',
    rating: 'Rating',
    signature: 'Signature',
  };
  return map[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

export const useFormStore = create<FormStore>((set, get) => ({
  id: null,
  name: 'Untitled Form',
  description: '',
  fields: [],
  settings: {
    allowMultipleSubmissions: true,
    requireLogin: false,
    showProgressBar: false,
    confirmationMessage: 'Thank you for your response!',
  },
  layout: { type: 'single-page' },
  isDirty: false,

  setForm: (form) => set({ ...form, isDirty: false }),

  addField: (type) =>
    set((s) => ({
      fields: [...s.fields, defaultField(type)],
      isDirty: true,
    })),

  updateField: (id, updates) =>
    set((s) => ({
      fields: s.fields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      isDirty: true,
    })),

  removeField: (id) =>
    set((s) => ({
      fields: s.fields.filter((f) => f.id !== id),
      isDirty: true,
    })),

  moveField: (fromIndex, toIndex) =>
    set((s) => {
      const fields = [...s.fields];
      const [moved] = fields.splice(fromIndex, 1);
      fields.splice(toIndex, 0, moved);
      return { fields, isDirty: true };
    }),

  setName: (name) => set({ name, isDirty: true }),
  setDescription: (description) => set({ description, isDirty: true }),

  updateSettings: (settings) =>
    set((s) => ({ settings: { ...s.settings, ...settings }, isDirty: true })),

  reset: () =>
    set({
      id: null,
      name: 'Untitled Form',
      description: '',
      fields: [],
      isDirty: false,
    }),
}));
