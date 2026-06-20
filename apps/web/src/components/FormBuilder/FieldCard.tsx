import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FormField } from '@form-builder/shared';

interface Props {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

const TYPE_PREVIEW: Partial<Record<FormField['type'], React.ReactNode>> = {
  text:      <div className="h-8 bg-gray-100 rounded border border-gray-200 px-3 flex items-center text-xs text-gray-400">Short answer text</div>,
  textarea:  <div className="h-16 bg-gray-100 rounded border border-gray-200 px-3 flex items-start pt-2 text-xs text-gray-400">Long answer text</div>,
  email:     <div className="h-8 bg-gray-100 rounded border border-gray-200 px-3 flex items-center text-xs text-gray-400">name@example.com</div>,
  number:    <div className="h-8 bg-gray-100 rounded border border-gray-200 px-3 flex items-center text-xs text-gray-400">0</div>,
  phone:     <div className="h-8 bg-gray-100 rounded border border-gray-200 px-3 flex items-center text-xs text-gray-400">+1 (555) 000-0000</div>,
  date:      <div className="h-8 bg-gray-100 rounded border border-gray-200 px-3 flex items-center text-xs text-gray-400">MM / DD / YYYY</div>,
  select:    <div className="h-8 bg-gray-100 rounded border border-gray-200 px-3 flex items-center justify-between text-xs text-gray-400"><span>Choose option</span><span>▼</span></div>,
  radio:     <div className="space-y-1">{['Option 1', 'Option 2'].map(o => <div key={o} className="flex items-center gap-2 text-xs text-gray-500"><div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300" />{o}</div>)}</div>,
  checkbox:  <div className="space-y-1">{['Option 1', 'Option 2'].map(o => <div key={o} className="flex items-center gap-2 text-xs text-gray-500"><div className="w-3.5 h-3.5 rounded border-2 border-gray-300" />{o}</div>)}</div>,
  file:      <div className="h-14 bg-gray-100 rounded border-2 border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400">📎 Click to upload</div>,
  rating:    <div className="flex gap-1">{[1,2,3,4,5].map(i => <span key={i} className="text-gray-300 text-lg">★</span>)}</div>,
  signature: <div className="h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-400">Signature area</div>,
  section:   <div className="border-t-2 border-gray-300 pt-1 text-xs text-gray-500 font-medium">Section divider</div>,
};

export function FieldCard({ field, isSelected, onSelect, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group relative bg-white rounded-xl border-2 p-4 cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-500 shadow-md shadow-blue-100'
          : 'border-gray-200 hover:border-gray-300'
      } ${field.layout.width === 'half' ? 'w-[calc(50%-6px)]' : field.layout.width === 'third' ? 'w-[calc(33%-8px)]' : 'w-full'}`}
    >
      {/* Drag handle */}
      <button
        {...listeners}
        {...attributes}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-40 hover:!opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
        </svg>
      </button>

      {/* Remove */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute right-2 top-2 p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all rounded"
      >
        ×
      </button>

      <div className="pl-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-800">{field.label}</span>
          {field.required && <span className="text-red-500 text-xs">*</span>}
        </div>

        {field.properties.helpText && (
          <p className="text-xs text-gray-400 mb-2">{field.properties.helpText}</p>
        )}

        {TYPE_PREVIEW[field.type] || (
          <div className="h-8 bg-gray-100 rounded border border-gray-200 flex items-center px-3 text-xs text-gray-400">
            {field.type}
          </div>
        )}
      </div>
    </div>
  );
}
