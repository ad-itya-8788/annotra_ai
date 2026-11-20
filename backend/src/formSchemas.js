const fieldTypes = new Set(['short', 'paragraph', 'email', 'phone', 'number', 'date', 'single', 'multiple', 'dropdown']);
const choiceTypes = new Set(['single', 'multiple', 'dropdown']);

export function slugifyFormTitle(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

export function normalizeFormDefinition(body) {
  const source = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const title = typeof source.title === 'string' ? source.title.trim() : '';
  const description = typeof source.description === 'string' ? source.description.trim() : '';
  const slug = slugifyFormTitle(source.slug || title);
  if (!title || title.length > 200) throw Object.assign(new Error('Form title is required and must be 200 characters or fewer.'), { status: 400 });
  if (description.length > 2000) throw Object.assign(new Error('Form description must be 2,000 characters or fewer.'), { status: 400 });
  if (!slug || slug.length > 80) throw Object.assign(new Error('Enter a valid form URL slug.'), { status: 400 });
  if (!Array.isArray(source.fields) || source.fields.length < 1 || source.fields.length > 50) {
    throw Object.assign(new Error('A form must contain between 1 and 50 questions.'), { status: 400 });
  }
  const ids = new Set();
  const fields = source.fields.map((item) => {
    const field = item && typeof item === 'object' && !Array.isArray(item) ? item : {};
    const id = typeof field.id === 'string' ? field.id.trim() : '';
    const label = typeof field.label === 'string' ? field.label.trim() : '';
    const type = typeof field.type === 'string' ? field.type : '';
    if (!/^[a-zA-Z0-9_-]{1,60}$/.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id) || ids.has(id)) {
      throw Object.assign(new Error('Each question must have a unique valid ID.'), { status: 400 });
    }
    ids.add(id);
    if (!label || label.length > 300 || !fieldTypes.has(type)) {
      throw Object.assign(new Error('Each question needs a prompt of up to 300 characters and a supported answer type.'), { status: 400 });
    }
    let options = [];
    if (choiceTypes.has(type)) {
      if (!Array.isArray(field.options)) throw Object.assign(new Error(`Add choices for "${label}".`), { status: 400 });
      if (field.options.some((option) => typeof option !== 'string')) {
        throw Object.assign(new Error(`Choices for "${label}" must be text.`), { status: 400 });
      }
      options = [...new Set(field.options.map((option) => option.trim().slice(0, 150)).filter(Boolean))];
      if (options.length < 2 || options.length > 50) {
        throw Object.assign(new Error(`"${label}" must have between 2 and 50 non-empty choices.`), { status: 400 });
      }
    }
    return { id, label, type, required: field.required === true, options };
  });
  return { title, description, slug, fields };
}

export function normalizeFormAnswers(fields, submitted) {
  if (!submitted || typeof submitted !== 'object' || Array.isArray(submitted)) {
    throw Object.assign(new Error('Submit your answers in the expected format.'), { status: 400 });
  }
  const fieldIds = new Set(fields.map((field) => field.id));
  if (Object.keys(submitted).some((key) => !fieldIds.has(key))) {
    throw Object.assign(new Error('The form has changed. Please reload it and try again.'), { status: 400 });
  }
  const answers = {};
  for (const field of fields) {
    const value = submitted[field.id];
    if (field.type === 'multiple') {
      if (value === undefined || value === null || value === '') {
        if (field.required) throw Object.assign(new Error(`"${field.label}" is required.`), { status: 400 });
        answers[field.id] = [];
        continue;
      }
      if (!Array.isArray(value) || value.length > 50 || value.some((option) => typeof option !== 'string' || !field.options.includes(option))) {
        throw Object.assign(new Error(`Choose valid options for "${field.label}".`), { status: 400 });
      }
      answers[field.id] = [...new Set(value)];
      if (field.required && !answers[field.id].length) throw Object.assign(new Error(`"${field.label}" is required.`), { status: 400 });
      continue;
    }
    if (value != null && typeof value !== 'string') {
      throw Object.assign(new Error(`Enter a valid answer for "${field.label}".`), { status: 400 });
    }
    const answer = typeof value === 'string' ? value.trim() : '';
    if (!answer && field.required) throw Object.assign(new Error(`"${field.label}" is required.`), { status: 400 });
    if (!answer) {
      answers[field.id] = '';
      continue;
    }
    if (typeof answer !== 'string' || answer.length > 5000) {
      throw Object.assign(new Error(`"${field.label}" must be 5,000 characters or fewer.`), { status: 400 });
    }
    if (choiceTypes.has(field.type) && !field.options.includes(answer)) {
      throw Object.assign(new Error(`Choose a valid option for "${field.label}".`), { status: 400 });
    }
    if (field.type === 'email' && (answer.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer))) {
      throw Object.assign(new Error(`Enter a valid email address for "${field.label}".`), { status: 400 });
    }
    if (field.type === 'phone' && !/^\+?[0-9\s().-]{7,30}$/.test(answer)) {
      throw Object.assign(new Error(`Enter a valid phone number for "${field.label}".`), { status: 400 });
    }
    if (field.type === 'number' && (!Number.isFinite(Number(answer)) || answer.length > 100)) {
      throw Object.assign(new Error(`Enter a valid number for "${field.label}".`), { status: 400 });
    }
    if (field.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(answer)
      || Number.isNaN(Date.parse(`${answer}T00:00:00.000Z`))
      || new Date(`${answer}T00:00:00.000Z`).toISOString().slice(0, 10) !== answer)) {
      throw Object.assign(new Error(`Enter a valid date for "${field.label}".`), { status: 400 });
    }
    answers[field.id] = answer;
  }
  return answers;
}
