import React from 'react';
import { ChevronRight, Headphones, LogOut } from 'lucide-react';
import { adminNav, employeeNav, reviewerNav, teamLeadNav, navPermission, userHasPermission } from '../../appConfig.js';
import './index.css';

const navThemes = {
  Dashboard: ['#4f70ef', '#edf1ff'],
  Employees: ['#9655df', '#f4edff'],
  Projects: ['#4c7fe6', '#eaf1ff'],
  'My Projects': ['#3398d2', '#e8f7ff'],
  'Available Projects': ['#149f86', '#e6f8f2'],
  Vendors: ['#ed8b39', '#fff2e6'],
  Forms: ['#d65b9c', '#ffedf5'],
  Applications: ['#d99116', '#fff5df'],
  'My Applications': ['#d99116', '#fff5df'],
  Announcements: ['#e55369', '#fff0f2'],
  'Create Email': ['#8058e9', '#f1edff'],
  'Send Email': ['#178b74', '#e7f8f1'],
  'Roles & Permissions': ['#6658d5', '#eeedff'],
  Reports: ['#188d9a', '#e7f8fa'],
  'Audit Logs': ['#718096', '#f0f3f8'],
  Settings: ['#4d86c6', '#eaf4ff'],
  'My Profile': ['#b35abf', '#f8edfb'],
  Messages: ['#d3772c', '#fff3e8'],
  Support: ['#e04f75', '#fff0f5'],
  Logout: ['#dd5b67', '#fff0f0'],
};

export default function Sidebar({ user, active, onNavigate, collapsed, onLogout, workspaceName, supportEmail, announcementCount = 0 }) {
  const annotator = user.role === 'Annotator';
  const roleLinks = user.role === 'Reviewer' ? reviewerNav : user.role === 'Team Lead' ? teamLeadNav : adminNav;
  const links = (annotator ? employeeNav : roleLinks).filter(([label])=>!navPermission[label]||userHasPermission(user,navPermission[label]));
  return <>
    <aside className={`sidebar ${collapsed?'collapsed':''}`}>
      <div className="brand-lockup sidebar-brand"><span className="brand-mark"><img src="/img/Annotra AI Circular Tech Badge.png" alt=""/></span><span className="brand-text"><b>{workspaceName||'Annotra AI'}</b><small>Team Management Workspace</small></span></div>
      <span className="sidebar-section-label">Workspace</span>
      <nav className="sidebar-nav" aria-label="Workspace navigation">
        {links.map(([label,Icon])=>{
          const [color,background]=navThemes[label]||['#6d7f9e','#f0f3f8'];
          return <button key={label} className={`nav-link ${active===label?'selected':''}`} aria-current={active===label?'page':undefined} onClick={()=>onNavigate(label)} title={label} style={{'--nav-icon-color':color,'--nav-icon-bg':background}}><span className="nav-icon" aria-hidden="true"><Icon size={17}/></span><span>{label}</span>{label==='Announcements'&&annotator&&announcementCount>0&&<i className="nav-count">{Math.min(announcementCount,9)}</i>}</button>;
        })}
        <button className="nav-link nav-link-logout" onClick={onLogout} title="Logout" style={{'--nav-icon-color':'#dd5b67','--nav-icon-bg':'#fff0f0'}}><span className="nav-icon" aria-hidden="true"><LogOut size={17}/></span><span>Logout</span></button>
      </nav>
      {supportEmail?<a className="help-card" href={`mailto:${supportEmail}`}><span className="help-icon"><Headphones size={17}/></span><div><b>Need Help?</b><small>Contact {supportEmail}<br/>for support.</small></div><ChevronRight size={14}/></a>:<div className="help-card"><span className="help-icon"><Headphones size={17}/></span><div><b>Need Help?</b><small>Contact your admin<br/>for support.</small></div><ChevronRight size={14}/></div>}
    </aside>
  </>;
}

