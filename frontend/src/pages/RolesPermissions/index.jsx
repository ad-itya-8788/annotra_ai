import React, { useEffect, useMemo, useState } from 'react';
import { Check, LoaderCircle, Plus } from 'lucide-react';
import { Panel } from '../../components/ui/index.jsx';
import './index.css';

export default function RolePermissionsPage({ roles, permissions, currentUser, onCreate, onSave, busy }) {
  const [selectedId,setSelectedId]=useState('');
  const [roleSearch,setRoleSearch]=useState('');
  const [moduleSearch,setModuleSearch]=useState('');
  const [draft,setDraft]=useState(null);
  const [editing,setEditing]=useState(false);
  const [message,setMessage]=useState('');
  const role=roles.find((item)=>item.id===selectedId)||null;
  const canManage=currentUser.role==='Super Admin'||currentUser.permissions?.includes('roles.manage');
  const canGrant=(code)=>currentUser.role==='Super Admin'||currentUser.permissions?.includes(code);

  useEffect(()=>{
    if(!roles.length)return;
    if(!selectedId||!roles.some((item)=>item.id===selectedId)){
      const initial=roles[0];
      setSelectedId(initial.id);
      setRoleSearch(initial.name);
      setDraft({name:initial.name,description:initial.description,permissions:[...initial.permissions]});
      setEditing(false);
    }
  },[roles,selectedId]);
  useEffect(()=>{
    if(!role)return;
    setRoleSearch(role.name);
    setDraft({name:role.name,description:role.description,permissions:[...role.permissions]});
    setEditing(false);
    setMessage('');
  },[selectedId,role?.name,role?.description,role?.permissions]);

  const modules=useMemo(()=>{
    const groups=new Map();
    for(const item of permissions){
      const [key,action='access']=item.code.split('.');
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push({code:item.code,action,description:item.description});
    }
    return [...groups.entries()].map(([key,items])=>({
      key,
      label:key.replaceAll('_',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase()),
      items:items.sort((a,b)=>a.action.localeCompare(b.action)),
    })).filter((module)=>`${module.label} ${module.items.map((item)=>item.code).join(' ')}`.toLowerCase().includes(moduleSearch.toLowerCase()));
  },[permissions,moduleSearch]);

  const dirty=Boolean(role&&draft&&(draft.name!==role.name||draft.description!==role.description
    ||[...draft.permissions].sort().join('|')!==[...role.permissions].sort().join('|')));
  const changeRole=(id)=>{
    if(!id||id===selectedId)return;
    if(dirty&&!window.confirm('Discard unsaved permission changes and switch roles?'))return;
    const next=roles.find((item)=>item.id===id);
    setSelectedId(id);
    setRoleSearch(next?.name||'');
  };
  const togglePermission=(code,checked)=>{
    if(!canGrant(code))return;
    setDraft((current)=>({...current,permissions:checked
      ?[...new Set([...current.permissions,code])]
      :current.permissions.filter((item)=>item!==code)}));
  };
  const toggleModule=(module,checked)=>{
    const allowed=module.items.filter((item)=>canGrant(item.code)).map((item)=>item.code);
    setDraft((current)=>({...current,permissions:checked
      ?[...new Set([...current.permissions,...allowed])]
      :current.permissions.filter((code)=>!allowed.includes(code))}));
  };
  const save=async()=>{
    if(!role||!draft||!dirty)return;
    if(!window.confirm(`Save permissions for ${role.name}?`))return;
    const saved=await onSave({...role,name:draft.name.trim(),description:draft.description},draft.permissions);
    if(saved){setEditing(false);setMessage('Permissions saved successfully.');}
  };

  return <section className="role-permissions-page">
    <div className="role-page-heading"><div><span className="eyebrow">ACCESS CONTROL</span><h2>Role &amp; Permissions</h2><p>Select a role, then tick the permissions it should have across each module.</p></div>{canManage&&<button className="button primary" onClick={onCreate}><Plus size={15}/>Add Role</button>}</div>
    <Panel title="Role setup" className="role-control-panel">
      <div className="role-controls">
        <label><span>Search and select role</span><input list="available-roles" value={roleSearch} placeholder="Type a role name to find it" onChange={(event)=>{setRoleSearch(event.target.value);const match=roles.find((item)=>item.name.toLowerCase()===event.target.value.toLowerCase());if(match)changeRole(match.id);}}/><datalist id="available-roles">{roles.map((item)=><option key={item.id} value={item.name}/>)}</datalist></label>
        <label><span>Role</span><select value={selectedId} onChange={(event)=>changeRole(event.target.value)}><option value="">Select a role</option>{roles.map((item)=><option key={item.id} value={item.id}>{item.name}{item.name==='Super Admin'?' (Protected)':''}</option>)}</select></label>
        {editing&&role?.name!=='Super Admin'&&<label><span>Role name</span><input value={draft?.name||''} maxLength={100} placeholder="Enter a role name" onChange={(event)=>setDraft((current)=>({...current,name:event.target.value}))}/></label>}
        {editing&&<label className="role-description-field"><span>Description</span><input value={draft?.description||''} maxLength={500} placeholder="Describe this role's responsibilities" onChange={(event)=>setDraft((current)=>({...current,description:event.target.value}))}/></label>}
        <div className="role-control-actions">{canManage&&role?.name!=='Super Admin'&&<button className="button secondary small" onClick={()=>setEditing((value)=>!value)} disabled={!role}>{editing?'Done editing':'Edit Role'}</button>}{canManage&&<button className="button secondary small" disabled={!draft||!role||role.name==='Super Admin'||!permissions.length} onClick={()=>setDraft((current)=>({...current,permissions:[...new Set([...current.permissions,...permissions.map((item)=>item.code).filter(canGrant)])]}))}>Select All</button>}{canManage&&<button className="button secondary small" disabled={!draft||!role||role.name==='Super Admin'} onClick={()=>setDraft((current)=>({...current,permissions:current.permissions.filter((code)=>!permissions.some((item)=>item.code===code&&canGrant(code)))}))}>Clear All</button>}{canManage&&<button className="button primary small" disabled={!dirty||busy||role?.name==='Super Admin'} onClick={save}>{busy?<LoaderCircle className="spin" size={14}/>:<Check size={14}/>}Save Permissions</button>}</div>
      </div>
      <div className="role-matrix-toolbar"><div><b>{role?.name||'Choose a role'}</b><span>{draft?.permissions.length||0} permissions selected</span></div><input type="search" placeholder="Search modules or permission names" value={moduleSearch} onChange={(event)=>setModuleSearch(event.target.value)}/></div>
      {message&&<div className="inline-success" role="status">{message}</div>}
      {!canManage&&<div className="empty-message">You have view-only access to role permissions.</div>}
      <div className="role-matrix-scroll"><table className="role-matrix"><thead><tr><th>Module</th><th><label className="matrix-module-check">Module all<input aria-label="Select all permissions for every module" type="checkbox" checked={Boolean(permissions.length&&permissions.filter((item)=>canGrant(item.code)).every((item)=>draft?.permissions.includes(item.code)))} disabled={!canManage||role?.name==='Super Admin'} onChange={(event)=>setDraft((current)=>({...current,permissions:event.target.checked?[...new Set([...current.permissions,...permissions.map((item)=>item.code).filter(canGrant)])]:current.permissions.filter((code)=>!permissions.some((item)=>item.code===code&&canGrant(code)))}))}/></label></th>{[...new Set(permissions.map((item)=>item.code.split('.')[1]||'access'))].sort().map((action)=><th key={action}>{action.replaceAll('_',' ')}</th>)}</tr></thead><tbody>
        {modules.map((module)=><tr key={module.key}><th scope="row">{module.label}</th><td><label className="matrix-check"><input aria-label={`Select all ${module.label} permissions`} type="checkbox" checked={Boolean(module.items.filter((item)=>canGrant(item.code)).length&&module.items.filter((item)=>canGrant(item.code)).every((item)=>draft?.permissions.includes(item.code)))} disabled={!canManage||role?.name==='Super Admin'||!module.items.some((item)=>canGrant(item.code))} onChange={(event)=>toggleModule(module,event.target.checked)}/><span>All</span></label></td>{[...new Set(permissions.map((item)=>item.code.split('.')[1]||'access'))].sort().map((action)=>{const item=module.items.find((entry)=>entry.action===action);return <td key={action}>{item?<label className={`matrix-check ${canGrant(item.code)?'':'unavailable'}`} title={canGrant(item.code)?item.description:'You cannot grant a permission you do not have'}><input type="checkbox" aria-label={`${module.label} ${action}`} checked={Boolean(draft?.permissions.includes(item.code))} disabled={!canManage||!canGrant(item.code)||role?.name==='Super Admin'} onChange={(event)=>togglePermission(item.code,event.target.checked)}/><span>{draft?.permissions.includes(item.code)?'Granted':canGrant(item.code)?'Denied':'Unavailable'}</span></label>:<span className="permission-unavailable">—</span>}</td>;})}</tr>)}
        {!modules.length&&<tr><td className="table-empty" colSpan={20}>No modules match this search.</td></tr>}
      </tbody></table></div>
      {dirty&&<p className="unsaved-warning">You have unsaved permission changes. Save them or they will be lost when you leave this role.</p>}
    </Panel>
  </section>;
}

