export function sanitizePresets(value = []) {
  if (!Array.isArray(value) || value.length > 20) throw new Error('Save at most 20 writing presets.');
  const ids = new Set();
  const names = new Set();
  return value.map(preset => {
    const id = typeof preset?.id === 'string' ? preset.id.trim() : '';
    const name = typeof preset?.name === 'string' ? preset.name.trim() : '';
    const instruction = typeof preset?.instruction === 'string' ? preset.instruction.trim() : '';
    if (!id || id.length > 100 || !name || name.length > 60 || !instruction || instruction.length > 500) {
      throw new Error('Each preset needs a name (1–60 characters) and instruction (1–500 characters).');
    }
    if (ids.has(id) || names.has(name.toLowerCase())) throw new Error('Give each writing preset a unique name.');
    ids.add(id);
    names.add(name.toLowerCase());
    return { id, name, instruction };
  });
}
