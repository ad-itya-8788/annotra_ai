import React, { useEffect, useState } from 'react';
import { Check, LoaderCircle } from 'lucide-react';
import { Panel } from '../../components/ui/index.jsx';
import './index.css';

export default function SettingsPage({ settings, preferences, canManageSettings, onSaveSettings, onSavePreferences, busy }) {
  const [system, setSystem] = useState(settings);
  const [personal, setPersonal] = useState(preferences);

  useEffect(() => setSystem(settings), [settings]);
  useEffect(() => setPersonal(preferences), [preferences]);

  return <div className="settings-grid">
    <Panel title="Workspace settings" className="settings-panel">
      {canManageSettings ? <form className="settings-form" onSubmit={(event) => { event.preventDefault(); onSaveSettings(system); }}>
        <label htmlFor="workspace-name">Workspace name</label>
        <input id="workspace-name" maxLength={120} placeholder="Annotra AI" value={system.workspaceName||''} onChange={(event) => setSystem((current) => ({...current,workspaceName:event.target.value}))} required/>
        <label htmlFor="support-email">Support email</label>
        <input id="support-email" type="email" maxLength={254} placeholder="annotrai.help@gmail.com" value={system.supportEmail||''} onChange={(event) => setSystem((current) => ({...current,supportEmail:event.target.value}))}/>
        <p>Workspace name and support contact are shared with all employees.</p>
        <button className="button primary" disabled={busy}>{busy?<LoaderCircle className="spin" size={15}/>:<Check size={15}/>}Save workspace settings</button>
      </form> : <div className="settings-readonly">
        <p><b>Workspace:</b> {settings.workspaceName||'Annotra AI'}</p>
        <p><b>Support:</b> {settings.supportEmail?<a href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a>:'Contact your administrator'}</p>
        <small>Only administrators with settings permission can change workspace settings.</small>
      </div>}
    </Panel>
    <Panel title="Personal preferences" className="settings-panel">
      <form className="settings-form" onSubmit={(event) => { event.preventDefault(); onSavePreferences(personal); }}>
        <label className="settings-toggle"><input type="checkbox" checked={Boolean(personal.compactMode)} onChange={(event) => setPersonal((current) => ({...current,compactMode:event.target.checked}))}/><span><b>Compact workspace</b><small>Reduce spacing across dashboard cards and tables.</small></span></label>
        <label className="settings-toggle"><input type="checkbox" checked={Boolean(personal.hideWelcome)} onChange={(event) => setPersonal((current) => ({...current,hideWelcome:event.target.checked}))}/><span><b>Hide welcome banner</b><small>Keep the dashboard focused on work items.</small></span></label>
        <p>These preferences are saved to your employee account.</p>
        <button className="button primary" disabled={busy}>{busy?<LoaderCircle className="spin" size={15}/>:<Check size={15}/>}Save personal preferences</button>
      </form>
    </Panel>
  </div>;
}

