import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowRight, Bold, CheckCircle2, Eye, FileText, Globe2, Italic, Link2,
  List, Lock, Paperclip, Pencil, Plus, Save, Search, Send, Sparkles, Trash2, Users, X,
} from 'lucide-react';
import { api } from '../../api.js';
import './index.css';

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
const parseRecipientEmails = (value) => [...new Set(String(value || '').split(/[,\s;]+/).map((email) => email.trim().toLowerCase()).filter(Boolean))];
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const safeLink = (value) => {
  try {
    const url = new URL(String(value || '').trim(), window.location.origin);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
};

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

export default function EmailStudioPage({ mode, lookups, invitations, emailConfig, templates, currentUser, templatesSupported, onChanged, notify }) {
  const [projectId, setProjectId] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [name, setName] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState(null);
  const [sendMode, setSendMode] = useState('template');
  const [view, setView] = useState('write');
  const [htmlState, setHtmlState] = useState(starterHtml);
  const [attachments, setAttachments] = useState([]);
  const [customEmail, setCustomEmail] = useState('');
  const [customRecipients, setCustomRecipients] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML.trim()) {
      editorRef.current.innerHTML = starterHtml;
      setHtmlState(starterHtml);
    }
  }, []);
  useEffect(() => {
    if ((mode === 'create' || (mode === 'send' && sendMode === 'custom')) && editorRef.current) {
      editorRef.current.innerHTML = htmlState;
    }
  }, [mode, sendMode]);

  const projects = lookups.projects || [];
  const recipients = lookups.invitationRecipients || [];
  const selectedRecipientCount = selectedIds.length + customRecipients.length;
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
    setSendMode('template');
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
    setSendMode('template');
    setView('write');
    setName('');
    setSubject('');
    setIsShared(false);
    if (editorRef.current) editorRef.current.innerHTML = starterHtml;
    setHtmlState(starterHtml);
    setError('');
  }

  function toggleRecipient(id) {
    if (!selectedIds.includes(id) && selectedRecipientCount >= 100) {
      setError('You can select up to 100 recipients per campaign.');
      return;
    }
    const employee = recipients.find((recipient) => recipient.id === id);
    if (!selectedIds.includes(id) && customRecipients.some((recipient) => recipient.email === employee?.email?.trim().toLowerCase())) {
      setError('That email address is already added as a custom recipient.');
      return;
    }
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function addCustomRecipient(value = customEmail) {
    const emails = parseRecipientEmails(value);
    if (!emails.length || emails.some((email) => !isValidEmail(email))) {
      setError('Enter a valid custom email address.');
      return;
    }
    const selectedEmployeeEmails = recipients
      .filter((recipient) => selectedIds.includes(recipient.id))
      .map((recipient) => recipient.email.trim().toLowerCase());
    const duplicateEmail = emails.find((email) =>
      customRecipients.some((recipient) => recipient.email === email) || selectedEmployeeEmails.includes(email));
    if (duplicateEmail) {
      setError(`${duplicateEmail} is already selected.`);
      return;
    }
    if (selectedRecipientCount + emails.length > 100) {
      setError('You can select up to 100 recipients per campaign.');
      return;
    }
    setCustomRecipients((current) => [...current, ...emails.map((email) => ({ email, name: email }))]);
    setCustomEmail('');
    setError('');
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
      const saved = activeTemplateId && !savingCopy
        ? await api(`/email-templates/${activeTemplateId}`, { method: 'PATCH', body: payload })
        : await api('/email-templates', { method: 'POST', body: payload });
      if (saved?.data?.id) setActiveTemplateId(saved.data.id);
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
    const pendingEmails = sendMode === 'custom' ? parseRecipientEmails(customEmail) : [];
    if (pendingEmails.some((email) => !isValidEmail(email))) {
      setError('Enter a valid custom email address.');
      return;
    }
    const duplicatePendingEmail = pendingEmails.find((email) =>
      customRecipients.some((recipient) => recipient.email === email));
    if (duplicatePendingEmail) {
      setError(`${duplicatePendingEmail} is already selected.`);
      return;
    }
    const customRecipientsToSend = [
      ...customRecipients,
      ...pendingEmails.map((email) => ({ email, name: email })),
    ];
    const recipientCountToSend = selectedIds.length + customRecipientsToSend.length;
    if (emailConfig?.configured === false) {
      setError('Email is not configured on the backend. Check the configuration warning above.');
      return;
    }
    if (sendMode === 'template' && !activeTemplateId) { setError('Choose a saved template before sending.'); return; }
    if (sendMode === 'template' && !projects.length) { setError('No projects are available for invitations yet.'); return; }
    if (sendMode === 'template' && !projectId) { setError('Choose a project before sending this template.'); return; }
    if (sendMode === 'custom' && !customRecipientsToSend.length) { setError('Add at least one recipient email for your custom email.'); return; }
    if (!selectedIds.length && !customRecipientsToSend.length) { setError('Select an employee or add a custom email recipient.'); return; }
    if (!subject.trim()) { setError('Enter an email subject.'); return; }
    if (!htmlState.trim()) { setError('Write an email message before sending.'); return; }
    if (recipientCountToSend > 100) { setError('Select no more than 100 recipients per campaign.'); return; }
    if (attachments.length > 5) { setError('Attach no more than 5 files.'); return; }
    if (attachments.some((file) => file.size > 5 * 1024 * 1024)) { setError('Each attachment must be 5 MB or smaller.'); return; }
    if (totalBytes > 10 * 1024 * 1024) { setError('Attachments must total 10 MB or less.'); return; }
    setBusy(true); setError('');
    try {
      const form = new FormData();
      if (projectId && sendMode === 'template') form.append('projectId', projectId);
      form.append('employeeIds', JSON.stringify(selectedIds));
      form.append('customRecipients', JSON.stringify(customRecipientsToSend));
      form.append('subject', subject.trim());
      form.append('message', stripHtml(htmlState));
      form.append('bodyHtml', htmlState);
      if (sendMode === 'template' && activeTemplateId && !String(activeTemplateId).startsWith('local-')) form.append('templateId', activeTemplateId);
      for (const file of attachments) form.append('attachments', file);
      const result = await api('/invitations', { method: 'POST', body: form });
      const outcomes = result.data || [];
      const sent = outcomes.filter((item) => item.status === 'Sent').length;
      const failed = outcomes.length - sent;
      notify(failed ? `${sent} sent, ${failed} failed.` : `${sent} email${sent === 1 ? '' : 's'} sent.`);
      setAttachments([]);
      setCustomRecipients([]);
      setCustomEmail('');
      setSelectedIds([]);
      onChanged();
    } catch (requestError) {
      const message = sendMode === 'custom' && /Select between 1 and 100 employees\.?/i.test(requestError.message)
        ? 'The current email service does not support custom recipients yet. Deploy the latest backend, then try again. No email was sent.'
        : requestError.message;
      setError(message);
    }
    finally { setBusy(false); }
  }

  return <div className="es-page">
    <div className="es-topbar">
      <div>
        <span className="es-kicker">CAMPAIGN WORKSPACE</span>
        <h1>Email Studio</h1>
        <p>Create reusable emails, preview them, and send to employee or custom addresses.</p>
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

    <div className={`es-workspace es-workspace-${mode}${mode === 'send' && sendMode === 'custom' ? ' es-workspace-send-custom' : ''}`}>
      <aside className="es-rail">
        <section className="es-card">
          <div className="es-card-head">
            <div><span className="es-kicker">LIBRARY</span><h2>Templates</h2></div>
            {mode === 'create' && <button className="es-icon-btn" onClick={newTemplate} aria-label="New template" title="New template"><Plus size={15}/></button>}
          </div>
          <div className="es-search"><Search size={14}/><input value={templateSearch} onChange={(event) => setTemplateSearch(event.target.value)} placeholder="Search templates…" aria-label="Search templates"/></div>
          <div className="es-list">
            {visibleTemplates.map((template) => {
              const canManage = !template.is_shared || template.created_by === currentUser?.id || currentUser?.role === 'Super Admin';
              return <div key={template.id} className={`es-list-row${activeTemplateId === template.id ? ' selected' : ''}`} onClick={() => applyTemplate(template)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); applyTemplate(template); } }}>
                <span className="es-list-icon"><FileText size={14}/></span>
                <span className="es-list-copy"><b>{template.name}</b><small>{template.subject}</small></span>
                <span className={`es-badge ${template.is_shared ? 'shared' : ''}`}>{template.is_shared ? <><Globe2 size={10}/> Shared</> : <><Lock size={10}/> Private</>}</span>
                {canManage && <button className="es-icon-btn ghost danger" aria-label={`Delete ${template.name}`} onClick={(event) => { event.stopPropagation(); removeTemplate(template); }}><Trash2 size={13}/></button>}
              </div>;
            })}
            {!visibleTemplates.length && <div className="es-empty"><Sparkles size={20}/><b>No templates yet</b><small>Save a campaign to reuse its design.</small></div>}
          </div>
        </section>

        {mode === 'send' && sendMode !== 'custom' && <section className="es-card es-audience-card">
          <div className="es-card-head">
            <div><span className="es-kicker">AUDIENCE</span><h2>Recipients</h2></div>
            <span className="es-count">{selectedRecipientCount} selected</span>
          </div>
          {sendMode === 'template' && <div className="es-search"><Search size={14}/><input value={recipientSearch} onChange={(event) => setRecipientSearch(event.target.value)} placeholder="Search people…" aria-label="Search recipients"/></div>}
          <form className="es-custom-recipient" onSubmit={(event) => { event.preventDefault(); addCustomRecipient(); }}>
            <label htmlFor="custom-recipient-email">Add an email address</label>
            <div><input id="custom-recipient-email" type="email" value={customEmail} onChange={(event) => setCustomEmail(event.target.value)} placeholder="name@example.com"/><button type="submit" className="es-icon-btn" aria-label="Add custom recipient"><Plus size={15}/></button></div>
          </form>
          {customRecipients.length > 0 && <div className="es-custom-list" aria-label="Custom recipients">
            {customRecipients.map((recipient) => <div key={recipient.email} className="es-custom-recipient-row">
              <span className="es-avatar">{recipient.email.slice(0, 1).toUpperCase()}</span>
              <span className="es-list-copy"><b>{recipient.email}</b><small>Custom email</small></span>
              <button className="es-icon-btn ghost danger" onClick={() => setCustomRecipients((current) => current.filter((item) => item.email !== recipient.email))} aria-label={`Remove ${recipient.email}`}><X size={13}/></button>
            </div>)}
          </div>}
          {sendMode === 'template' && <div className="es-list">
            {filteredRecipients.map((employee) => <label key={employee.id} className={`es-list-row person${selectedIds.includes(employee.id) ? ' selected' : ''}`}>
              <input type="checkbox" checked={selectedIds.includes(employee.id)} onChange={() => toggleRecipient(employee.id)} aria-label={`Select ${employee.full_name}`}/>
              <span className="es-avatar">{employee.full_name?.split(' ').map((part) => part[0]).slice(0, 2).join('') || '?'}</span>
              <span className="es-list-copy"><b>{employee.full_name}</b><small>{employee.email}</small></span>
            </label>)}
            {!filteredRecipients.length && <div className="es-empty"><Users size={20}/><b>No employees found</b><small>You can still add a custom email above.</small></div>}
          </div>}
        </section>}
      </aside>

      <main className="es-center">
        {mode === 'create' ? <>
        <section className="es-card es-builder">
          <div className="es-step"><span>01</span><div><b>Email details</b><small>Write your subject and message. Preview it before moving to send.</small></div></div>
          <div className="es-form-grid">
            <label><span>Subject line</span><input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="An exciting new project for you"/></label>
          </div>

          <div className="es-step with-tabs">
            <div><span>02</span><div><b>Message</b><small>Design your email and see it exactly as recipients will.</small></div></div>
            <div className="es-tabs" role="tablist" aria-label="Editor view">
              <button role="tab" aria-selected={view === 'write'} className={view === 'write' ? 'active' : ''} onClick={() => setView('write')}><Pencil size={13}/> Write</button>
              <button role="tab" aria-selected={view === 'preview'} className={view === 'preview' ? 'active' : ''} onClick={() => setView('preview')}><Eye size={13}/> Preview</button>
            </div>
          </div>

          <div className={`es-canvas view-${view}`}>
            <div className="es-editor-pane" style={{ display: showEditor ? '' : 'none' }}>
              <div className="es-toolbar">
                <button type="button" aria-label="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('bold')}><Bold size={14}/></button>
                <button type="button" aria-label="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('italic')}><Italic size={14}/></button>
                <button type="button" aria-label="Bullet list" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('insertUnorderedList')}><List size={14}/></button>
                <button type="button" aria-label="Insert link" onMouseDown={(event) => event.preventDefault()} onClick={() => { const input = window.prompt('Link URL', 'https://'); if (!input) return; const url = safeLink(input); if (!url) { setError('Enter a valid http, https, or mailto link.'); return; } runCommand('createLink', url); }}><Link2 size={14}/></button>
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

        </section>

        </> : <>
        <section className={`es-card es-builder es-send-preview${sendMode === 'custom' ? ' es-custom-composer' : ''}`}>
          <div className="es-send-mode-tabs" role="tablist" aria-label="Choose what to send">
            <button role="tab" aria-selected={sendMode === 'template'} className={sendMode === 'template' ? 'active' : ''} onClick={() => setSendMode('template')}><FileText size={14}/> Saved template</button>
            <button role="tab" aria-selected={sendMode === 'custom'} className={sendMode === 'custom' ? 'active' : ''} onClick={() => { setSendMode('custom'); setSelectedIds([]); setProjectId(''); setActiveTemplateId(null); setName(''); setIsShared(false); setSubject(''); setHtmlState(''); setView('write'); setError(''); }}><Pencil size={14}/> Custom email</button>
          </div>
          {sendMode === 'template' ? <>
            <div className="es-step"><span>01</span><div><b>Select a template</b><small>Choose a saved template from the list or here.</small></div></div>
            <div className="es-form-grid">
              <label><span>Project</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                <option value="">Select a project…</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select></label>
              <label><span>Email template</span><select value={activeTemplateId || ''} onChange={(event) => {
                const template = templates.find((item) => item.id === event.target.value);
                if (template) applyTemplate(template);
                else {
                  setActiveTemplateId(null);
                  setSubject('');
                  setHtmlState(starterHtml);
                }
              }}>
                <option value="">Select a saved template…</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
              </select></label>
              <label className="es-subject-display"><span>Subject</span><input value={subject} readOnly placeholder="Choose a template first"/></label>
            </div>
            <div className="es-step"><span>02</span><div><b>Preview</b><small>{activeTemplate?.name || 'Select a template to preview its email.'}</small></div></div>
            <div className="es-preview-pane es-send-preview-pane">
              <div className="es-preview-head"><Eye size={12}/> EMAIL PREVIEW <span>{subject || 'Subject not written'}</span></div>
              <iframe sandbox="" title="Email preview before sending" className="es-preview-frame" srcDoc={htmlState}/>
            </div>
          </> : <>
            <div className="es-compose-header">
              <div className="es-compose-title"><span><Pencil size={15}/></span><div><b>New message</b><small>Custom email</small></div></div>
              <div className="es-compose-view-tabs" role="tablist" aria-label="Custom email editor view">
                <button role="tab" aria-selected={view === 'write'} className={view === 'write' ? 'active' : ''} onClick={() => setView('write')}><Pencil size={13}/> Write</button>
                <button role="tab" aria-selected={view === 'preview'} className={view === 'preview' ? 'active' : ''} onClick={() => setView('preview')}><Eye size={13}/> Preview</button>
              </div>
            </div>
            <div className="es-compose-fields">
              <div className="es-compose-row es-compose-to">
                <label htmlFor="custom-recipient-email">To</label>
                <div className="es-compose-addresses">
                  {customRecipients.map((recipient) => <span key={recipient.email} className="es-address-chip">
                    {recipient.email}
                    <button type="button" aria-label={`Remove ${recipient.email}`} onClick={() => setCustomRecipients((current) => current.filter((item) => item.email !== recipient.email))}><X size={13}/></button>
                  </span>)}
                  <input
                    id="custom-recipient-email"
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    value={customEmail}
                    onChange={(event) => setCustomEmail(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ',' || event.key === ';') {
                        event.preventDefault();
                        addCustomRecipient();
                      }
                    }}
                    placeholder={customRecipients.length ? 'Add another recipient' : 'Enter an email address'}
                    aria-label="Add recipient email"
                  />
                  <button type="button" className="es-add-recipient" onClick={() => addCustomRecipient()}><Plus size={14}/> Add</button>
                </div>
              </div>
              <div className="es-compose-row">
                <label htmlFor="custom-email-subject">Subject</label>
                <input id="custom-email-subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject"/>
              </div>
            </div>
            <div className={`es-compose-body view-${view}`}>
              <div ref={editorRef} className="es-editor" style={{ display: showEditor ? '' : 'none' }} contentEditable suppressContentEditableWarning onInput={syncHtml} role="textbox" aria-label="Custom email body"/>
              <iframe sandbox="" title="Custom email preview" className="es-preview-frame" style={{ display: showPreview ? '' : 'none' }} srcDoc={htmlState}/>
            </div>
            {showEditor && <div className="es-toolbar es-compose-toolbar">
              <button type="button" aria-label="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('bold')}><Bold size={14}/></button>
              <button type="button" aria-label="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('italic')}><Italic size={14}/></button>
              <button type="button" aria-label="Bullet list" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('insertUnorderedList')}><List size={14}/></button>
              <button type="button" aria-label="Insert link" onMouseDown={(event) => event.preventDefault()} onClick={() => { const input = window.prompt('Link URL', 'https://'); if (!input) return; const url = safeLink(input); if (!url) { setError('Enter a valid http, https, or mailto link.'); return; } runCommand('createLink', url); }}><Link2 size={14}/></button>
              <span className="es-divider"/>
              {colors.map((color) => <button key={color} type="button" className="es-swatch" style={{ background: color }} aria-label={`Text color ${color}`} onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('foreColor', color)}/>)}
              <span className="es-divider"/>
              <button type="button" aria-label="Clear editor" onClick={() => { if (editorRef.current) editorRef.current.innerHTML = ''; setHtmlState(''); }}><X size={14}/></button>
            </div>}
            <div className="es-compose-footer">
              <div className="es-compose-actions">
                <button className="es-button primary es-compose-send" onClick={sendCampaign} disabled={busy || emailConfig?.configured === false}>
                  {busy ? <span className="es-spinner"/> : <Send size={14}/>} Send
                </button>
                <label className="es-compose-attach" title="Attach files"><Paperclip size={17}/><input type="file" multiple onChange={(event) => setAttachments(Array.from(event.target.files || []))} hidden/></label>
                {attachments.map((file, index) => <span key={`${file.name}-${index}`} className="es-chip">{file.name}<button onClick={() => setAttachments((current) => current.filter((_, position) => position !== index))} aria-label={`Remove ${file.name}`}><X size={11}/></button></span>)}
              </div>
              <small>{selectedRecipientCount} recipient{selectedRecipientCount === 1 ? '' : 's'} · {attachments.length}/5 files · {(totalBytes / 1024 / 1024).toFixed(1)}/10 MB</small>
            </div>
          </>}
          {sendMode === 'template' && <div className="es-attachments">
            <label className="es-attach-btn"><Paperclip size={14}/> Attach files
              <input type="file" multiple onChange={(event) => setAttachments(Array.from(event.target.files || []))} hidden/>
            </label>
            {attachments.map((file, index) => <span key={`${file.name}-${index}`} className="es-chip">{file.name}<button onClick={() => setAttachments((current) => current.filter((_, position) => position !== index))} aria-label={`Remove ${file.name}`}><X size={11}/></button></span>)}
            <small>{attachments.length}/5 files · {(totalBytes / 1024 / 1024).toFixed(1)}/10 MB</small>
          </div>}
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
        </>}
      </main>

      <aside className="es-rail es-summary-rail">
        {mode === 'send' ? <>
        <section className="es-card es-send-card">
          <span className="es-kicker">REVIEW & SEND</span>
          <h2>Ready to launch</h2>
          <div className="es-summary-list">
            <div><span>Project</span><b>{sendMode === 'custom' ? 'Custom email' : projects.find((project) => project.id === projectId)?.name || 'Not selected'}</b></div>
            <div><span>Recipients</span><b>{selectedRecipientCount || '—'}</b></div>
            <div><span>Attachments</span><b>{attachments.length || 'None'}</b></div>
            <div><span>Subject</span><b>{subject || 'Not written'}</b></div>
          </div>
          <div className="es-send-actions">
            <button className="es-button primary" onClick={sendCampaign} disabled={busy || emailConfig?.configured === false}>
              {busy ? <span className="es-spinner"/> : <Send size={15}/>} Send email <ArrowRight size={14}/>
            </button>
          </div>
          <p className="es-hint">Review the preview before sending. Every result appears in the campaign history below.</p>
        </section>
        </> : <section className="es-card es-send-card es-create-card">
          <span className="es-kicker">EMAIL TEMPLATE</span>
          <h2>{activeTemplateId ? 'Edit your email' : 'Save this email'}</h2>
          <p className="es-hint">Save the template here. Open Send Email from the sidebar when you are ready to send it.</p>
          <label className="es-field"><span>Template name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Auto from subject"/></label>
          <label className="es-share"><input type="checkbox" checked={isShared} onChange={(event) => setIsShared(event.target.checked)}/><span>Share this template with the team</span></label>
          <div className="es-send-actions">
            <button className="es-button secondary" onClick={saveTemplate} disabled={busy}><Save size={15}/> {activeTemplateId && canManageActive ? 'Update template' : 'Save template'}</button>
          </div>
        </section>}
      </aside>
    </div>
  </div>;
}

function fmtDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' });
}

