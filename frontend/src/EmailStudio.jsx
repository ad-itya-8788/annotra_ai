import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowRight, Bold, CheckCircle2, Eye, FileText, Globe2, Italic, Link2,
  List, Lock, Mail, Paperclip, Pencil, Plus, Save, Search, Send, Sparkles, Trash2, Users, X, XCircle,
} from 'lucide-react';
import { api } from './api.js';

const starterHtml = `<div style="font-family:Arial,sans-serif;color:#263f75;line-height:1.7">
  <p>Hi there,</p>
  <p>We have an exciting new annotation project available for you. Your expertise would be a great addition to the team.</p>
  <p><b>What happens next?</b></p>
  <ul><li>Review the project details</li><li>Accept the invitation from your workspace</li><li>Start annotating with your team</li></ul>
  <p>Feel free to reach out if you have any questions.</p>
  <p>Thanks,<br/>The Annotra AI Team</p>
</div>`;

const LOCAL_TEMPLATES_KEY = 'annotra.emailTemplates.local';
const colors = ['#17366f', '#704ff5', '#4385ff', '#159f78', '#e0567c', '#e28b21'];

export function readLocalTemplates() {
  try {
    const value = JSON.parse(window.localStorage.getItem(LOCAL_TEMPLATES_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

export function writeLocalTemplates(templates) {
  try { window.localStorage.setItem(LOCAL_TEMPLATES_KEY, JSON.stringify(templates)); } catch { /* storage unavailable */ }
}

const stripHtml = (value) => String(value || '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(p|div|li)>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/gi, ' ')
  .trim();

const friendlyEmailError = (error) => /API route not found/i.test(error?.message || '')
  ? 'Template sync is unavailable on this deployment. Saving locally in this browser instead.'
  : error?.message || 'Something went wrong.';

export default function EmailStudioPage({ lookups, invitations, emailConfig, templates, currentUser, templatesSupported, onChanged, notify }) {
  const [projectId, setProjectId] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [name, setName] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState(null);
  const [view, setView] = useState('split');
  const [htmlState, setHtmlState] = useState(starterHtml);
  const [attachments, setAttachments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML.trim()) {
      editorRef.current.innerHTML = starterHtml;
      setHtmlState(starterHtml);
    }
  }, []);

  const projects = lookups.projects || [];
  const recipients = lookups.invitationRecipients || [];
  const filteredRecipients = useMemo(() => recipients.filter((employee) =>
    `${employee.full_name} ${employee.email}`.toLowerCase().includes(recipientSearch.toLowerCase())), [recipients, recipientSearch]);
  const visibleTemplates = useMemo(() => templates.filter((template) =>
    `${template.name} ${template.subject}`.toLowerCase().includes(templateSearch.toLowerCase())), [templates, templateSearch]);
  const sentCount = invitations.filter((item) => item.status === 'Sent').length;
  const failedCount = invitations.filter((item) => item.status === 'Failed').length;
  const activeTemplate = templates.find((template) => template.id === activeTemplateId);
  const canManageActive = !activeTemplate?.is_shared
    || activeTemplate?.created_by === currentUser?.id
    || currentUser?.role === 'Super Admin';
  const showEditor = view !== 'preview';
  const showPreview = view !== 'write';
  const totalBytes = attachments.reduce((total, file) => total + file.size, 0);

  const syncHtml = () => setHtmlState(editorRef.current?.innerHTML || '');
  const runCommand = (command, value) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    window.setTimeout(syncHtml, 0);
  };

  function applyTemplate(template) {
    setActiveTemplateId(template.id);
    setName(template.name);
    setSubject(template.subject);
    setIsShared(Boolean(template.is_shared));
    if (editorRef.current) editorRef.current.innerHTML = template.body_html || starterHtml;
    setHtmlState(template.body_html || starterHtml);
    setError('');
  }

  function newTemplate() {
    setActiveTemplateId(null);
    setName('');
    setSubject('');
    setIsShared(false);
    if (editorRef.current) editorRef.current.innerHTML = starterHtml;
    setHtmlState(starterHtml);
    setError('');
  }

  function toggleRecipient(id) {
    if (!selectedIds.includes(id) && selectedIds.length >= 100) {
      setError('You can select up to 100 recipients per campaign.');
      return;
    }
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function saveTemplate() {
    if (!subject.trim() || !htmlState.trim()) {
      setError('Add a subject and email body before saving the template.');
      return;
    }
    const templateName = name.trim() || subject.trim().slice(0, 120);
    const savingCopy = Boolean(activeTemplateId && !canManageActive);
    const finalName = savingCopy ? `${templateName} (copy)` : templateName;
    setBusy(true); setError('');
    try {
      if (templatesSupported === false) {
        const localId = activeTemplateId && String(activeTemplateId).startsWith('local-')
          ? activeTemplateId
          : `local-${Date.now()}`;
        const next = [
          ...templates.filter((template) => template.id !== activeTemplateId),
          { id: localId, name: finalName, subject: subject.trim(), body_html: htmlState, is_shared: false, created_by: currentUser?.id, created_at: new Date().toISOString() },
        ];
        writeLocalTemplates(next);
        setActiveTemplateId(localId);
        setName(finalName);
        notify('Template saved in this browser.');
        onChanged();
        return;
      }
      const payload = JSON.stringify({ name: finalName, subject: subject.trim(), bodyHtml: htmlState, isShared });
      if (activeTemplateId && !savingCopy) await api(`/email-templates/${activeTemplateId}`, { method: 'PATCH', body: payload });
      else await api('/email-templates', { method: 'POST', body: payload });
      if (savingCopy) setActiveTemplateId(null);
      setName(finalName);
      notify(savingCopy ? 'Saved as your own template copy.' : 'Email template saved.');
      onChanged();
    } catch (requestError) { setError(friendlyEmailError(requestError)); }
    finally { setBusy(false); }
  }

  async function removeTemplate(template) {
    if (!window.confirm(`Delete the "${template.name}" template?`)) return;
    setBusy(true); setError('');
    try {
      if (templatesSupported === false) {
        writeLocalTemplates(templates.filter((item) => item.id !== template.id));
        if (activeTemplateId === template.id) newTemplate();
        notify('Template removed from this browser.');
        onChanged();
        return;
      }
      await api(`/email-templates/${template.id}`, { method: 'DELETE' });
      if (activeTemplateId === template.id) newTemplate();
      notify('Email template deleted.');
      onChanged();
    } catch (requestError) { setError(friendlyEmailError(requestError)); }
    finally { setBusy(false); }
  }

  async function sendCampaign() {
    if (emailConfig?.configured === false) {
      setError('Email is not configured on the backend. Check the configuration warning above.');
      return;
    }
    if (!projects.length) { setError('No projects are available for invitations yet.'); return; }
    if (!projectId) { setError('Choose a project before sending.'); return; }
    if (!recipients.length) { setError('No employees with email addresses are available. Add employee emails first.'); return; }
    if (!selectedIds.length) { setError('Select at least one recipient from the list.'); return; }
    if (!subject.trim()) { setError('Enter an email subject.'); return; }
    if (!htmlState.trim()) { setError('Write an email message before sending.'); return; }
    if (selectedIds.length > 100) { setError('Select no more than 100 recipients per campaign.'); return; }
    if (attachments.length > 5) { setError('Attach no more than 5 files.'); return; }
    if (attachments.some((file) => file.size > 5 * 1024 * 1024)) { setError('Each attachment must be 5 MB or smaller.'); return; }
    if (totalBytes > 10 * 1024 * 1024) { setError('Attachments must total 10 MB or less.'); return; }
    setBusy(true); setError('');
    try {
      const form = new FormData();
      form.append('projectId', projectId);
      form.append('employeeIds', JSON.stringify(selectedIds));
      form.append('subject', subject.trim());
      form.append('message', stripHtml(htmlState));
      form.append('bodyHtml', htmlState);
      if (activeTemplateId && !String(activeTemplateId).startsWith('local-')) form.append('templateId', activeTemplateId);
      for (const file of attachments) form.append('attachments', file);
      const result = await api('/invitations', { method: 'POST', body: form });
      const outcomes = result.data || [];
      const sent = outcomes.filter((item) => item.status === 'Sent').length;
      const failed = outcomes.length - sent;
      notify(failed ? `${sent} sent, ${failed} failed.` : `${sent} email${sent === 1 ? '' : 's'} sent.`);
      setAttachments([]);
      onChanged();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  return <div className="es-page">
    <div className="es-topbar">
      <div>
        <span className="es-kicker">CAMPAIGN WORKSPACE</span>
        <h1>Email Studio</h1>
        <p>Compose a colorful invitation, preview it live, and send it to the right people.</p>
      </div>
      <div className="es-top-metrics">
        <div><span>Campaigns</span><b>{invitations.length}</b></div>
        <div><span>Delivered</span><b className="good">{sentCount}</b></div>
        <div><span>Failed</span><b className="bad">{failedCount}</b></div>
        <div className={`es-config-pill ${emailConfig?.configured === false ? 'warn' : 'ok'}`}>
          {emailConfig?.configured === false ? <AlertCircle size={13}/> : <CheckCircle2 size={13}/>}
          {emailConfig?.configured === false ? 'Email not configured' : 'Email ready'}
        </div>
      </div>
    </div>

    {emailConfig?.configured === false && <div className="es-alert" role="alert">
      <AlertCircle size={16}/>
      <span><b>Email is not configured.</b> Add {emailConfig.missing?.length ? emailConfig.missing.join(', ') : 'EMAIL_USER, EMAIL_PASSWORD, and EMAIL_FROM'} to the backend environment and restart it.</span>
    </div>}
    {templatesSupported === false && <div className="es-alert" role="status">
      <AlertCircle size={16}/>
      <span><b>Template sync is unavailable.</b> The deployed backend does not have `/api/email-templates`. Templates are saved in this browser only until the backend is redeployed.</span>
    </div>}
    {error && <div className="es-alert danger" role="alert">
      <AlertCircle size={16}/><span>{error}</span>
      <button onClick={() => setError('')} aria-label="Dismiss error"><X size={14}/></button>
    </div>}

    <div className="es-workspace">
      <aside className="es-rail">
        <section className="es-card">
          <div className="es-card-head">
            <div><span className="es-kicker">LIBRARY</span><h2>Templates</h2></div>
            <button className="es-icon-btn" onClick={newTemplate} aria-label="New template" title="New template"><Plus size={15}/></button>
          </div>
          <div className="es-search"><Search size={14}/><input value={templateSearch} onChange={(event) => setTemplateSearch(event.target.value)} placeholder="Search templates…" aria-label="Search templates"/></div>
          <div className="es-list">
            {visibleTemplates.map((template) => {
              const canManage = !template.is_shared || template.created_by === currentUser?.id || currentUser?.role === 'Super Admin';
              return <div key={template.id} className={`es-list-row${activeTemplateId === template.id ? ' selected' : ''}`} onClick={() => applyTemplate(template)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') applyTemplate(template); }}>
                <span className="es-list-icon"><FileText size={14}/></span>
                <span className="es-list-copy"><b>{template.name}</b><small>{template.subject}</small></span>
                <span className={`es-badge ${template.is_shared ? 'shared' : ''}`}>{template.is_shared ? <><Globe2 size={10}/> Shared</> : <><Lock size={10}/> Private</>}</span>
                {canManage && <button className="es-icon-btn ghost danger" aria-label={`Delete ${template.name}`} onClick={(event) => { event.stopPropagation(); removeTemplate(template); }}><Trash2 size={13}/></button>}
              </div>;
            })}
            {!visibleTemplates.length && <div className="es-empty"><Sparkles size={20}/><b>No templates yet</b><small>Save a campaign to reuse its design.</small></div>}
          </div>
        </section>

        <section className="es-card es-audience-card">
          <div className="es-card-head">
            <div><span className="es-kicker">AUDIENCE</span><h2>Recipients</h2></div>
            <span className="es-count">{selectedIds.length} selected</span>
          </div>
          <div className="es-search"><Search size={14}/><input value={recipientSearch} onChange={(event) => setRecipientSearch(event.target.value)} placeholder="Search people…" aria-label="Search recipients"/></div>
          <div className="es-list">
            {filteredRecipients.map((employee) => <label key={employee.id} className={`es-list-row person${selectedIds.includes(employee.id) ? ' selected' : ''}`}>
              <input type="checkbox" checked={selectedIds.includes(employee.id)} onChange={() => toggleRecipient(employee.id)} aria-label={`Select ${employee.full_name}`}/>
              <span className="es-avatar">{employee.full_name?.split(' ').map((part) => part[0]).slice(0, 2).join('') || '?'}</span>
              <span className="es-list-copy"><b>{employee.full_name}</b><small>{employee.email}</small></span>
            </label>)}
            {!filteredRecipients.length && <div className="es-empty"><Users size={20}/><b>No recipients found</b><small>Add employee email addresses first.</small></div>}
          </div>
        </section>
      </aside>

      <main className="es-center">
        <section className="es-card es-builder">
          <div className="es-step"><span>01</span><div><b>Campaign details</b><small>Choose where this invitation goes and what it says.</small></div></div>
          <div className="es-form-grid">
            <label><span>Project</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              <option value="">Select a project…</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select></label>
            <label><span>Subject line</span><input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="An exciting new project for you"/></label>
          </div>

          <div className="es-step with-tabs">
            <div><span>02</span><div><b>Message</b><small>Design your email and see it exactly as recipients will.</small></div></div>
            <div className="es-tabs" role="tablist" aria-label="Editor view">
              <button className={view === 'split' ? 'active' : ''} aria-pressed={view === 'split'} onClick={() => setView('split')}><Pencil size={13}/> Split</button>
              <button className={view === 'write' ? 'active' : ''} aria-pressed={view === 'write'} onClick={() => setView('write')}><Pencil size={13}/> Write</button>
              <button className={view === 'preview' ? 'active' : ''} aria-pressed={view === 'preview'} onClick={() => setView('preview')}><Eye size={13}/> Preview</button>
            </div>
          </div>

          <div className={`es-canvas view-${view}`}>
            <div className="es-editor-pane" style={{ display: showEditor ? '' : 'none' }}>
              <div className="es-toolbar">
                <button type="button" aria-label="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('bold')}><Bold size={14}/></button>
                <button type="button" aria-label="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('italic')}><Italic size={14}/></button>
                <button type="button" aria-label="Bullet list" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('insertUnorderedList')}><List size={14}/></button>
                <button type="button" aria-label="Insert link" onMouseDown={(event) => event.preventDefault()} onClick={() => { const url = window.prompt('Link URL'); if (url) runCommand('createLink', url); }}><Link2 size={14}/></button>
                <span className="es-divider"/>
                {colors.map((color) => <button key={color} type="button" className="es-swatch" style={{ background: color }} aria-label={`Text color ${color}`} onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('foreColor', color)}/>)}
                <span className="es-divider"/>
                <button type="button" aria-label="Clear editor" onClick={() => { if (editorRef.current) editorRef.current.innerHTML = ''; setHtmlState(''); }}><X size={14}/></button>
              </div>
              <div ref={editorRef} className="es-editor" contentEditable suppressContentEditableWarning onInput={syncHtml} role="textbox" aria-label="Email body"/>
            </div>
            {showPreview && <div className="es-preview-pane">
              <div className="es-preview-head"><Eye size={12}/> LIVE PREVIEW <span>Updates as you type</span></div>
              <iframe sandbox="" title="Email preview" className="es-preview-frame" srcDoc={htmlState}/>
            </div>}
          </div>

          <div className="es-attachments">
            <label className="es-attach-btn"><Paperclip size={14}/> Attach files
              <input type="file" multiple onChange={(event) => setAttachments(Array.from(event.target.files || []))} hidden/>
            </label>
            {attachments.map((file, index) => <span key={`${file.name}-${index}`} className="es-chip">{file.name}<button onClick={() => setAttachments((current) => current.filter((_, position) => position !== index))} aria-label={`Remove ${file.name}`}><X size={11}/></button></span>)}
            <small>{attachments.length}/5 files · {(totalBytes / 1024 / 1024).toFixed(1)}/10 MB</small>
          </div>
        </section>

        <section className="es-card es-history-card">
          <div className="es-card-head"><div><span className="es-kicker">ACTIVITY</span><h2>Recent campaigns</h2></div><span className="es-count">{invitations.length} total</span></div>
          <div className="es-table-wrap"><table>
            <thead><tr><th>Project</th><th>Recipient</th><th>Subject</th><th>Status</th><th>Sent</th></tr></thead>
            <tbody>
              {invitations.map((item) => <tr key={item.id}>
                <td>{item.project}</td>
                <td>{item.employee}<small>{item.email}</small></td>
                <td>{item.subject}</td>
                <td><span className={`es-status ${item.status.toLowerCase()}`}>{item.status}</span></td>
                <td>{fmtDateTime(item.created_at)}</td>
              </tr>)}
              {!invitations.length && <tr><td colSpan="5" className="es-table-empty">No campaigns sent yet.</td></tr>}
            </tbody>
          </table></div>
        </section>
      </main>

      <aside className="es-rail es-summary-rail">
        <section className="es-card es-send-card">
          <span className="es-kicker">03 / REVIEW & SEND</span>
          <h2>Ready to launch</h2>
          <div className="es-summary-list">
            <div><span>Project</span><b>{projects.find((project) => project.id === projectId)?.name || 'Not selected'}</b></div>
            <div><span>Recipients</span><b>{selectedIds.length || '—'}</b></div>
            <div><span>Attachments</span><b>{attachments.length || 'None'}</b></div>
            <div><span>Subject</span><b>{subject || 'Not written'}</b></div>
          </div>
          <label className="es-field"><span>Template name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Auto from subject"/></label>
          <label className="es-share"><input type="checkbox" checked={isShared} onChange={(event) => setIsShared(event.target.checked)}/><span>Share this template with the team</span></label>
          <div className="es-send-actions">
            <button className="es-button secondary" onClick={saveTemplate} disabled={busy}><Save size={15}/> {activeTemplateId && canManageActive ? 'Update template' : 'Save template'}</button>
            <button className="es-button primary" onClick={sendCampaign} disabled={busy || emailConfig?.configured === false}>
              {busy ? <span className="es-spinner"/> : <Send size={15}/>} Send emails <ArrowRight size={14}/>
            </button>
          </div>
          <p className="es-hint">Each recipient gets a personalized copy. Failed sends are recorded in the activity table.</p>
        </section>
        <section className="es-card es-guide-card">
          <span className="es-kicker">QUICK GUIDE</span>
          <h2>Before you send</h2>
          <ol>
            <li>Pick the project and write a clear subject.</li>
            <li>Apply a template or design a fresh message.</li>
            <li>Select recipients from the audience list.</li>
            <li>Review the live preview, then send.</li>
          </ol>
        </section>
      </aside>
    </div>
  </div>;
}

function fmtDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' });
}
