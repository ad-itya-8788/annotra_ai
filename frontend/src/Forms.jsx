import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Download, ExternalLink, FilePlus2, LoaderCircle, Plus, Send, Trash2, X } from 'lucide-react';
import { api, setCsrfToken } from './api.js';
import { updatePageMetadata } from './seo.js';

const fieldTypes = [
  ['short', 'Short answer'],
  ['paragraph', 'Paragraph'],
  ['email', 'Email'],
  ['phone', 'Phone number'],
  ['number', 'Number'],
  ['date', 'Date'],
  ['single', 'Multiple choice'],
  ['multiple', 'Checkboxes (select one)'],
  ['dropdown', 'Dropdown'],
  ['file', 'File upload'],
];
const choiceTypes = new Set(['single', 'multiple', 'dropdown']);
const cleanSlug = (value) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80).replace(/-+$/g, '');
const createField = () => ({
  id: globalThis.crypto?.randomUUID?.().replaceAll('-', '') || `${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
  label: '',
  type: 'short',
  placeholder: '',
  required: false,
  options: [],
});
const csvCell = (value) => {
  const text = Array.isArray(value) ? value.join('; ') : value && typeof value === 'object' ? value.name || value.url || '' : value == null ? '' : String(value);
  const safe = /^[\s\u0000-\u001f]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

function downloadResponses(form, responses) {
  const headings = ['Submitted at', ...form.fields.map((field) => field.label)];
  const rows = responses.map((response) => [
    new Date(response.created_at).toISOString(),
    ...form.fields.map((field) => response.answers?.[field.id] ?? ''),
  ]);
  const csv = `\uFEFF${[headings, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${cleanSlug(form.title) || 'form'}-responses.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function FormsPage() {
  const [forms, setForms] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const selected = forms.find((form) => form.id === selectedId);

  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api('/forms');
      setForms(result.data);
      setSelectedId((current) => current && result.data.some((form) => form.id === current) ? current : '');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    updatePageMetadata({
      title: 'Forms | Annotra AI',
      description: 'Create public forms and review submitted responses in the Annotra AI workspace.',
      robots: 'noindex,nofollow',
    });
    loadForms();
  }, [loadForms]);

  useEffect(() => {
    if (!selectedId) {
      setResponseData(null);
      setLoadingResponses(false);
      return;
    }
    let active = true;
    setResponseData(null);
    setError('');
    setLoadingResponses(true);
    api(`/forms/${selectedId}/responses`)
      .then((result) => { if (active) setResponseData(result.data); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoadingResponses(false); });
    return () => { active = false; };
  }, [selectedId]);

  const beginNew = () => {
    setError('');
    setNotice('');
    setResponseData(null);
    setSelectedId('');
    setSlugEdited(false);
    setDraft({ title: '', description: '', slug: '', fields: [createField()] });
  };
  const editForm = (form) => {
    setError('');
    setNotice('');
    setSelectedId(form.id);
    setSlugEdited(true);
    setDraft({ title: form.title, description: form.description, slug: form.slug, fields: form.fields });
  };
  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const updateField = (id, patch) => setDraft((current) => ({
    ...current,
    fields: current.fields.map((field) => field.id === id ? { ...field, ...patch } : field),
  }));
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const body = { ...draft, slug: cleanSlug(draft.slug || draft.title) };
      const result = await api(selectedId ? `/forms/${selectedId}` : '/forms', {
        method: selectedId ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      });
      await loadForms();
      setSelectedId(result.data.id);
      setDraft({ title: result.data.title, description: result.data.description, slug: result.data.slug, fields: result.data.fields });
      setNotice('Form saved as a draft.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };
  const togglePublish = async () => {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      await api(`/forms/${selected.id}/publish`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublished: !selected.is_published }),
      });
      await loadForms();
      setNotice(selected.is_published ? 'Form unpublished.' : 'Form published and ready to share.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };
  const deleteForm = async () => {
    if (!selected || !window.confirm(`Delete "${selected.title}" and all of its responses? This cannot be undone.`)) return;
    setBusy(true);
    setError('');
    try {
      await api(`/forms/${selected.id}`, { method: 'DELETE' });
      setDraft(null);
      setSelectedId('');
      setResponseData(null);
      await loadForms();
      setNotice('Form and responses deleted.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };
  const shareUrl = selected ? `${window.location.origin}/forms/${encodeURIComponent(selected.slug)}` : '';
  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice('Public form link copied.');
    } catch {
      setError('Could not copy the link. Copy it from the address bar after opening the public form.');
    }
  };

  return <section className="forms-page">
    {error && <div className="error-banner" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={14}/></button></div>}
    {notice && <div className="inline-success" role="status">{notice}</div>}
    <section className="panel forms-list-panel">
      <div className="panel-heading"><h2>Your forms</h2><button className="button primary small" type="button" onClick={beginNew}><FilePlus2 size={14}/>Create form</button></div>
      {loading ? <div className="forms-loading"><LoaderCircle className="spin" size={18}/>Loading forms…</div>
        : forms.length ? <div className="forms-list">{forms.map((form) => <article key={form.id} className={`forms-list-item ${selectedId === form.id ? 'selected' : ''}`}>
          <button type="button" className="forms-list-select" onClick={() => { setSelectedId(form.id); setDraft(null); setError(''); setNotice(''); }}>
            <span className="forms-list-title">{form.title}</span><small>/forms/{form.slug}</small>
          </button>
          <span className={`forms-status ${form.is_published ? 'published' : ''}`}>{form.is_published ? 'Published' : 'Draft'}</span>
          <span className="forms-response-count">{form.response_count} responses</span>
          <button className="button secondary small" type="button" onClick={() => editForm(form)}>Edit</button>
        </article>)}</div>
          : <div className="forms-empty"><FilePlus2 size={22}/><b>No forms yet</b><span>Create your first form to start collecting responses.</span></div>}
    </section>

    {draft && <section className="panel forms-editor-panel">
      <div className="panel-heading"><h2>{selectedId ? 'Edit form' : 'Build a form'}</h2><button className="icon-button" type="button" aria-label="Close editor" onClick={() => setDraft(null)}><X size={16}/></button></div>
      <form className="forms-editor" onSubmit={save}>
        <label>Form title<input value={draft.title} maxLength={200} required placeholder="e.g. Contact request" onChange={(event) => {
          const title = event.target.value;
          setDraft((current) => ({ ...current, title, slug: slugEdited ? current.slug : cleanSlug(title) }));
        }}/></label>
        <label>Public URL slug<div className="forms-slug-field"><span>/forms/</span><input value={draft.slug} maxLength={80} required placeholder="contact-request" onChange={(event) => {
          setSlugEdited(true);
          updateDraft('slug', cleanSlug(event.target.value));
        }}/></div></label>
        <label className="forms-description-field">Description<textarea rows="2" maxLength={2000} value={draft.description} placeholder="Tell people what this form is for." onChange={(event) => updateDraft('description', event.target.value)}/></label>
        <div className="forms-questions-heading"><div><h3>Questions</h3><span>Add up to 50 questions.</span></div><button className="button secondary small" type="button" disabled={draft.fields.length >= 50} onClick={() => updateDraft('fields', [...draft.fields, createField()])}><Plus size={14}/>Add question</button></div>
        {draft.fields.map((field, index) => <article className="forms-question" key={field.id}>
          <header><b>Question {index + 1}</b><button type="button" className="text-button forms-remove-question" aria-label={`Remove question ${index + 1}`} onClick={() => updateDraft('fields', draft.fields.filter((item) => item.id !== field.id))}><Trash2 size={14}/>Remove</button></header>
          <div className="forms-question-grid">
            <label>Question text<input value={field.label} maxLength={300} required placeholder="Enter your question" onChange={(event) => updateField(field.id, { label: event.target.value })}/></label>
            <label>Answer type<select value={field.type} onChange={(event) => updateField(field.id, { type: event.target.value, options: choiceTypes.has(event.target.value) ? field.options.length ? field.options : ['Option 1', 'Option 2'] : [] })}>{fieldTypes.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
            {!choiceTypes.has(field.type) && field.type !== 'file' && <label>Placeholder<input value={field.placeholder || ''} maxLength={200} placeholder="e.g. Enter your answer" onChange={(event) => updateField(field.id, { placeholder: event.target.value })}/></label>}
            {choiceTypes.has(field.type) && <label className="forms-options-field">Choices<textarea rows="3" value={field.options.join('\n')} onChange={(event) => updateField(field.id, { options: event.target.value.split('\n') })} placeholder={'One choice per line'}/></label>}
            {field.type === 'file' && <small className="forms-file-hint">PDF, DOC, DOCX, JPG, PNG, or WebP. Maximum file size: 4 MB.</small>}
            <label className="forms-required-toggle"><input type="checkbox" checked={field.required} onChange={(event) => updateField(field.id, { required: event.target.checked })}/>Required question</label>
          </div>
        </article>)}
        <footer className="forms-editor-actions">
          {selectedId && <button className="button danger small" type="button" disabled={busy} onClick={deleteForm}><Trash2 size={14}/>Delete</button>}
          {selected && <button className="button secondary small" type="button" disabled={busy} onClick={togglePublish}>{selected.is_published ? 'Unpublish' : 'Publish'}</button>}
          <button className="button primary" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={15}/> : <Check size={15}/>}Save form</button>
        </footer>
      </form>
    </section>}

    {selected && !draft && <section className="panel forms-details-panel">
      <div className="panel-heading"><div><h2>{selected.title}</h2><p>{selected.is_published ? 'This form is live and accepting responses.' : 'Publish this form to start collecting responses.'}</p></div><button className="button secondary small" type="button" onClick={() => editForm(selected)}>Edit form</button></div>
      <div className="forms-share-row">
        <span className={`forms-status ${selected.is_published ? 'published' : ''}`}>{selected.is_published ? 'Published' : 'Draft'}</span>
        <code>{shareUrl}</code>
        <button className="button secondary small" type="button" disabled={!selected.is_published} onClick={copyShareUrl}><Copy size={14}/>Copy link</button>
        <a className="button secondary small" href={shareUrl} target="_blank" rel="noreferrer" aria-disabled={!selected.is_published} onClick={(event) => { if (!selected.is_published) event.preventDefault(); }}><ExternalLink size={14}/>Open</a>
        <button className={`button ${selected.is_published ? 'secondary' : 'primary'} small`} type="button" disabled={busy} onClick={togglePublish}>{selected.is_published ? 'Unpublish' : 'Publish'}</button>
      </div>
      <div className="forms-responses-heading"><div><h3>Responses</h3><span>{responseData?.responses.length ?? 0} submissions</span></div><button className="button secondary small" type="button" disabled={!responseData?.responses.length} onClick={() => downloadResponses(responseData.form, responseData.responses)}><Download size={14}/>Export CSV</button></div>
      {loadingResponses ? <div className="forms-loading"><LoaderCircle className="spin" size={18}/>Loading responses…</div>
        : !responseData ? <div className="forms-empty">Responses could not be loaded.</div>
        : responseData.responses.length ? <div className="table-scroll"><table className="forms-responses-table"><thead><tr><th>Submitted</th>{responseData.form.fields.map((field) => <th key={field.id}>{field.label}</th>)}</tr></thead><tbody>{responseData.responses.map((response) => <tr key={response.id}><td>{new Date(response.created_at).toLocaleString()}</td>{responseData.form.fields.map((field) => {
          const answer = response.answers?.[field.id];
          return <td key={field.id}>{Array.isArray(answer) ? answer.join(', ') : answer && typeof answer === 'object' && answer.url ? <a href={answer.url} target="_blank" rel="noreferrer">{answer.name || 'View file'}</a> : answer || '—'}</td>;
        })}</tr>)}</tbody></table></div>
          : <div className="forms-empty">Responses will appear here after someone submits the public form.</div>}
    </section>}
  </section>;
}

function FormQuestion({ field, value, onChange, onFileChange, uploading }) {
  const labelId = `${field.id}-label`;
  const placeholder = field.placeholder || {
    short: 'Enter your answer',
    paragraph: 'Enter your answer',
    email: 'name@example.com',
    phone: '+91 98765 43210',
    number: 'Enter a number',
  }[field.type] || '';
  if (field.type === 'file') return <>
    <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp" aria-labelledby={labelId} required={field.required && !value?.url} disabled={uploading} onChange={(event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file) onFileChange(file);
    }}/>
    {uploading && <small className="public-form-file-status">Uploading file…</small>}
    {value?.name && <small className="public-form-file-status">Uploaded: {value.name}</small>}
  </>;
  if (field.type === 'paragraph') return <textarea rows="4" aria-labelledby={labelId} value={value || ''} placeholder={placeholder} required={field.required} onChange={(event) => onChange(event.target.value)}/>;
  if (field.type === 'single') return <div className="public-form-choices" role="radiogroup" aria-labelledby={labelId}>{field.options.map((option) => <label key={option}><input type="radio" name={field.id} value={option} checked={value === option} required={field.required} onChange={() => onChange(option)}/>{option}</label>)}</div>;
  if (field.type === 'multiple') return <div className="public-form-choices" role="group" aria-labelledby={labelId}>{field.options.map((option) => <label key={option}><input type="checkbox" value={option} checked={value === option} onChange={(event) => onChange(event.target.checked ? option : '')}/>{option}</label>)}</div>;
  if (field.type === 'dropdown') return <select aria-labelledby={labelId} value={value || ''} required={field.required} onChange={(event) => onChange(event.target.value)}><option value="">Select an option</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  const type = field.type === 'short' ? 'text' : field.type === 'phone' ? 'tel' : field.type;
  return <input type={type} aria-labelledby={labelId} value={value || ''} placeholder={placeholder} required={field.required} onChange={(event) => onChange(event.target.value)}/>;
}

export function PublicFormPage({ slug }) {
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [uploadingFields, setUploadingFields] = useState({});

  useEffect(() => {
    let active = true;
    api(`/public/forms/${encodeURIComponent(slug)}`)
      .then(async (formResult) => {
        if (!active) return;
        const sessionResult = await api('/auth/session').catch(() => null);
        if (!active) return;
        if (sessionResult?.csrfToken) setCsrfToken(sessionResult.csrfToken);
        setForm(formResult.data);
        updatePageMetadata({
          title: `${formResult.data.title} | Annotra AI`,
          description: formResult.data.description || `Fill in the ${formResult.data.title} form.`,
          robots: 'noindex,nofollow',
        });
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message);
          updatePageMetadata({ title: 'Form unavailable | Annotra AI', description: 'This form is not available.', robots: 'noindex,nofollow' });
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  const uploadResponseFile = async (field, file) => {
    if (file.size > 4 * 1024 * 1024) {
      setError('File must be no larger than 4 MB.');
      return;
    }
    setError('');
    setUploadingFields((current) => ({ ...current, [field.id]: true }));
    const body = new FormData();
    body.set('file', file);
    try {
      const result = await api(`/public/forms/${encodeURIComponent(slug)}/uploads/${encodeURIComponent(field.id)}`, {
        method: 'POST',
        body,
      });
      setAnswers((current) => ({ ...current, [field.id]: result.data }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploadingFields((current) => ({ ...current, [field.id]: false }));
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (Object.values(uploadingFields).some(Boolean)) return;
    setBusy(true);
    setError('');
    try {
      await api(`/public/forms/${encodeURIComponent(slug)}/responses`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      });
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <main className="public-form-shell"><div className="forms-loading"><LoaderCircle className="spin" size={20}/>Loading form…</div></main>;
  if (error && !form) return <main className="public-form-shell"><section className="public-form-card"><img src="/img/Annotra AI Circular Tech Badge.png" alt="Annotra AI"/><h1>Form unavailable</h1><p>{error}</p></section></main>;
  if (submitted) return <main className="public-form-shell"><section className="public-form-card public-form-success"><span><Check size={22}/></span><h1>Response submitted</h1><p>Thank you. Your response has been recorded.</p></section></main>;
  return <main className="public-form-shell">
    <form className="public-form-card" onSubmit={submit}>
      <header className="public-form-header"><img src="/img/Annotra AI Circular Tech Badge.png" alt="Annotra AI"/><span>ANNOTRA AI</span></header>
      <div className="public-form-title"><h1>{form.title}</h1>{form.description && <p>{form.description}</p>}</div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <div className="public-form-questions">{form.fields.map((field) => <div className="public-form-question" key={field.id}>
        <span id={`${field.id}-label`}>{field.label}{field.required && <i aria-hidden="true"> *</i>}</span>
        <FormQuestion field={field} value={answers[field.id]} uploading={uploadingFields[field.id]} onFileChange={(file) => uploadResponseFile(field, file)} onChange={(value) => setAnswers((current) => ({ ...current, [field.id]: value }))}/>
      </div>)}</div>
      <footer><button className="button primary" type="submit" disabled={busy||Object.values(uploadingFields).some(Boolean)}>{busy||Object.values(uploadingFields).some(Boolean) ? <LoaderCircle className="spin" size={15}/> : <Send size={15}/>}Submit response</button><small>Your response is sent securely to the form owner.</small></footer>
    </form>
  </main>;
}
