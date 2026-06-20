import type { FormField } from '@form-builder/shared';
import { useDraggable } from '@dnd-kit/core';

interface PaletteItem {
  type: FormField['type'];
  label: string;
  icon: React.ReactNode;
  group: string;
}

const PALETTE: PaletteItem[] = [
  { group: 'Basic', type: 'text', label: 'Short Text', icon: '✏️' },
  { group: 'Basic', type: 'textarea', label: 'Long Text', icon: '📝' },
  { group: 'Basic', type: 'number', label: 'Number', icon: '🔢' },
  { group: 'Basic', type: 'email', label: 'Email', icon: '✉️' },
  { group: 'Basic', type: 'phone', label: 'Phone', icon: '📞' },
  { group: 'Choice', type: 'radio', label: 'Multiple Choice', icon: '⚪' },
  { group: 'Choice', type: 'checkbox', label: 'Checkboxes', icon: '☑️' },
  { group: 'Choice', type: 'select', label: 'Dropdown', icon: '▼' },
  { group: 'Choice', type: 'multiselect', label: 'Multi-select', icon: '☰' },
  { group: 'Date & Time', type: 'date', label: 'Date', icon: '📅' },
  { group: 'Date & Time', type: 'time', label: 'Time', icon: '🕐' },
  { group: 'Date & Time', type: 'datetime', label: 'Date & Time', icon: '📆' },
  { group: 'Advanced', type: 'file', label: 'File Upload', icon: '📎' },
  { group: 'Advanced', type: 'rating', label: 'Rating', icon: '⭐' },
  { group: 'Advanced', type: 'signature', label: 'Signature', icon: '✍️' },
  { group: 'Advanced', type: 'scale', label: 'Scale', icon: '📊' },
  { group: 'Layout', type: 'section', label: 'Section', icon: '─' },
  { group: 'Layout', type: 'page_break', label: 'Page Break', icon: '⏎' },
];

function DraggablePaletteItem({ item }: { item: PaletteItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${item.type}`,
    data: { type: 'palette', fieldType: item.type },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-grab select-none transition-all ${
        isDragging
          ? 'opacity-50 bg-blue-50'
          : 'hover:bg-gray-100 text-gray-700'
      }`}
    >
      <span className="text-base leading-none w-5 text-center">{item.icon}</span>
      <span>{item.label}</span>
    </div>
  );
}

const GROUPS = [...new Set(PALETTE.map((p) => p.group))];

export function FieldPalette() {
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fields</p>
        <p className="text-xs text-gray-400 mt-0.5">Drag to add</p>
      </div>
      <div className="p-2 space-y-4 flex-1">
        {GROUPS.map((group) => (
          <div key={group}>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-3 mb-1">{group}</p>
            {PALETTE.filter((p) => p.group === group).map((item) => (
              <DraggablePaletteItem key={item.type} item={item} />
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
