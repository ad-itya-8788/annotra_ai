import React from 'react';
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, Building2, CalendarDays, Check, ChevronRight,
  CircleCheckBig, Clock3, FileText, FolderClosed, Image, LockKeyhole, Mail, Megaphone, Settings,
  Shield, Sparkles, Tag, User, UserRound, Users, X,
} from 'lucide-react';
import { fmtDate } from '../../appConfig.js';
import { EmptyRow, Panel, StatCard, StatusBadge } from '../../components/ui/index.jsx';
import './index.css';

export function Welcome({ user, employee, dismiss, onDismiss, workspaceName }) {
  const today = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  return <section className={`welcome-banner ${employee?'employee-banner':''}`}>
    <div className="welcome-copy">
      <span className="date-line"><CalendarDays size={15}/>{today}</span>
      <h1>{employee?`Hello, ${user.name}!`:`Welcome back, ${user.name.split(' ')[0]}!`} <span className="wave">👋</span></h1>
      <p>Here's your {employee?'dashboard overview and latest updates.':"what's happening with your projects and team today."}</p>
      <span className="banner-chip"><Sparkles size={12}/>{employee?'Annotator Dashboard':`${workspaceName||'Annotra AI'} Workspace`}</span>
    </div>
    <img className="banner-illustration" src="/img/dashbordwelcome.png" alt="" aria-hidden="true"/>
    {!dismiss&&<button className="banner-close" onClick={onDismiss} aria-label="Dismiss welcome banner"><X size={13}/></button>}
  </section>;
}

export function AdminDashboard({ data, permissions, onNavigate }) {
  const stats=data?.stats||{};
  const counts=data?.overview||[];
  const total=counts.reduce((sum,item)=>sum+item.count,0)||1;
  const colors={'In Progress':'#4385ff',Completed:'#32b991','On Hold':'#ffaf3d',Draft:'#a4aed1',Published:'#7956ed'};
  const segments=counts.map((item)=>`${colors[item.status]||'#b7c4e8'} ${item.count/total*100}%`).join(',')||'#dce5fc 100%';
  const progress=data?.progress||[];
  const max=Math.max(1,...progress.map((item)=>item.count));
  const points=progress.map((item,index)=>`${12+index*(270/Math.max(1,progress.length-1))},${74-(item.count/max)*55}`).join(' ');
  return <>
    <div className="stats-grid admin-stats">
      <StatCard title="Total Employees" value={stats.employees} tone="purple" icon={Users} detail={{text:'all account statuses'}}/>
      <StatCard title="Pending Registrations" value={stats.pending_registrations} tone="orange" icon={Clock3} detail={{text:'awaiting approval'}}/>
      <StatCard title="Active Employees" value={stats.active_employees} tone="green" icon={UserRound} detail={{text:'approved accounts'}}/>
      <StatCard title="Inactive Employees" value={stats.inactive_employees} tone="pink" icon={LockKeyhole} detail={{text:'deactivated accounts'}}/>
      <StatCard title="Total Projects" value={stats.projects} tone="blue" icon={FolderClosed} detail={{text:'in the system'}}/>
      <StatCard title="Total Annotators" value={stats.annotators} tone="purple" icon={UserRound} detail={{text:'active workforce'}}/>
      <StatCard title="Total Vendors" value={stats.vendors} tone="orange" icon={Building2} detail={{text:'active partners'}}/>
      <StatCard title="Total Applications" value={stats.applications} tone="pink" icon={Mail} detail={{text:'all submissions'}}/>
    </div>
    <div className="dashboard-row admin-overview">
      <Panel title="Project Overview" className="overview-panel">
        <div className="overview-content"><div className="donut-wrap"><div className="donut" style={{background:`conic-gradient(${segments})`}}><span><b>{stats.projects||0}</b><small>Total Projects</small></span></div></div>
          <div className="legend">{counts.map((item)=><div key={item.status}><i style={{background:colors[item.status]||'#b7c4e8'}}/><span>{item.status}</span><b>{item.count}</b><small>{Math.round(item.count/total*100)}%</small></div>)}</div>
        </div>
      </Panel>
      <Panel title="Project Progress" className="chart-panel">
        <div className="line-chart"><div className="chart-y-labels"><span>10</span><span>8</span><span>6</span><span>4</span><span>2</span><span>0</span></div><svg viewBox="0 0 295 88" preserveAspectRatio="none" role="img" aria-label="Project creation activity"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#7057ff" stopOpacity=".2"/><stop offset="100%" stopColor="#7057ff" stopOpacity="0"/></linearGradient></defs>{[8,25,42,59,76].map((y)=><line key={y} x1="0" x2="295" y1={y} y2={y} stroke="#e9effa" strokeWidth="1"/>)}{points&&<><polygon points={`12,87 ${points} 282,87`} fill="url(#chartFill)"/><polyline points={points} fill="none" stroke="#7057ff" strokeWidth="2"/>{points.split(' ').map((point,i)=><circle key={i} cx={point.split(',')[0]} cy={point.split(',')[1]} r="2.1" fill="#fff" stroke="#7057ff" strokeWidth="1.5"/>)}</>}</svg><div className="chart-x-labels">{(progress.length?progress.map((item)=>item.month):['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct']).map((item,i)=><span key={`${item}${i}`}>{item}</span>)}</div></div>
      </Panel>
      <Panel title="Quick Actions" className="quick-panel">
        <div className="quick-actions">{[
          ['employees.create','Employees','Add New Employee',Users,'purple'],
          ['projects.create','Projects','Add New Project',FolderClosed,'blue'],
          ['vendors.create','Vendors','Add New Vendor',Building2,'green'],
          ['invitations.send','Send Email','Send Invitations',Mail,'orange'],
        ].filter(([permission])=>permissions?.includes(permission)).map(([permission,page,label,Icon,tone])=><button key={permission} onClick={()=>onNavigate(page)} className={`quick ${tone}`}><Icon size={15}/>{label}<ChevronRight size={14}/></button>)}</div>
      </Panel>
    </div>
    <div className="dashboard-row data-row">
      <Panel title="Recent Projects" action={{label:'View All',onClick:()=>onNavigate('Projects')}} className="table-panel">
        <div className="table-scroll"><table><thead><tr><th>#</th><th>Project Name</th><th>Vendor</th><th>Status</th><th>Deadline</th><th>Progress</th></tr></thead><tbody>
          {(data?.projects||[]).map((item,i)=><tr key={item.id}><td>{i+1}</td><td className="strong">{item.name}</td><td>{item.vendor}</td><td><StatusBadge value={item.status}/></td><td>{fmtDate(item.application_deadline)}</td><td><div className="progress-cell"><i><b style={{width:`${item.progress}%`}}/></i><small>{item.progress}%</small></div></td></tr>)}
          {!data?.projects?.length&&<EmptyRow colSpan="6"/>}
        </tbody></table></div>
      </Panel>
      <Panel title="Recent Applications" action={{label:'View All',onClick:()=>onNavigate('Applications')}} className="table-panel">
        <div className="table-scroll"><table><thead><tr><th>#</th><th>Employee</th><th>Project</th><th>Applied On</th><th>Status</th></tr></thead><tbody>
          {(data?.applications||[]).map((item,i)=><tr key={item.id}><td>{i+1}</td><td className="strong">{item.employee}</td><td>{item.project}</td><td>{fmtDate(item.applied_at)}</td><td><StatusBadge value={item.status}/></td></tr>)}
          {!data?.applications?.length&&<EmptyRow colSpan="5"/>}
        </tbody></table></div>
      </Panel>
    </div>
    <AnnouncementCards items={data?.announcements||[]} onNavigate={onNavigate}/>
  </>;
}

export function TeamDashboard({ data, user, onNavigate }) {
  const projects=data?.projects||[];
  return <div className="team-dashboard">
    <div className="stats-grid admin-stats">
      <StatCard title="Assigned Projects" value={data?.stats?.assigned_projects||0} tone="blue" icon={FolderClosed} detail={{text:'assigned to your account'}}/>
    </div>
    <div className="dashboard-row admin-overview">
      <Panel title="Your Assigned Projects" action={{label:'View Projects',onClick:()=>onNavigate('Projects')}}>
        <div className="available-list standalone">
          {projects.map((project)=><article className="available-item" key={project.id}>
            <div className="project-symbol"><FolderClosed size={18}/></div>
            <div className="project-details"><b>{project.name}</b><span>{project.vendor}</span></div>
            <StatusBadge value={project.status}/>
          </article>)}
          {!projects.length&&<div className="empty-message">No projects are assigned to your account yet.</div>}
        </div>
      </Panel>
      <Panel title="Latest Announcements" action={{label:'View All',onClick:()=>onNavigate('Announcements')}}>
        <AnnouncementList items={data?.announcements||[]}/>
      </Panel>
    </div>
    <p className="muted">Signed in as {user.role}. Your access is limited to modules assigned to this role.</p>
  </div>;
}

export function EmployeeDashboard({ data, onNavigate, onApply }) {
  const stats=data?.stats||{};
  const applicationCounts=[
    {label:'Approved',value:Number(stats.approved_projects)||0,color:'#22b88a'},
    {label:'Pending',value:Number(stats.pending_applications)||0,color:'#f2a33a'},
    {label:'Other',value:Math.max(0,(Number(stats.my_applications)||0)-(Number(stats.approved_projects)||0)-(Number(stats.pending_applications)||0)),color:'#7185ee'},
  ];
  const applicationTotal=applicationCounts.reduce((sum,item)=>sum+item.value,0);
  return <>
    <div className="stats-grid employee-stats">
      <StatCard title="Available Projects" value={stats.available_projects} tone="purple" icon={Users} detail={{text:'open for applications'}}/>
      <StatCard title="My Applications" value={stats.my_applications} tone="blue" icon={FileText} detail={{text:'submitted by you'}}/>
      <StatCard title="Approved Projects" value={stats.approved_projects} tone="green" icon={CircleCheckBig} detail={{text:'this month'}}/>
      <StatCard title="Pending Applications" value={stats.pending_applications} tone="orange" icon={Clock3} detail={{text:'in review',down:true}}/>
    </div>
    <div className="employee-dashboard-content">
    <div className="employee-grid">
      <div className="employee-left">
        <Panel title="Available Projects" action={{label:'View All',onClick:()=>onNavigate('Available Projects')}} className="available-panel">
          <div className="available-list">{(data?.projects||[]).slice(0,4).map((project)=><article className="available-item" key={project.id}>
            <div className="project-symbol"><Image size={19}/></div><div className="project-details"><b>{project.name}</b><span>Vendor: {project.vendor}</span><div className="skill-tags">{(project.required_skills||[]).slice(0,3).map((tag)=><i key={tag}>{tag}</i>)}</div></div>
            <div className="deadline"><CalendarDays size={13}/><span>Deadline<br/><b>{fmtDate(project.application_deadline)}</b></span></div>
            <button disabled={project.applied} className={`button small ${project.applied?'applied-button':'primary'}`} onClick={()=>onApply(project.id)}>{project.applied?'Applied':'Apply'}</button>
          </article>)}{!data?.projects?.length&&<div className="empty-message">No open projects right now.</div>}</div>
        </Panel>
        <Panel title="Quick Actions" className="employee-quick-panel"><div className="employee-quick-actions">
          <button onClick={()=>onNavigate('My Projects')}><FolderClosed/><span>View My Projects</span></button><button onClick={()=>onNavigate('My Applications')}><FileText/><span>Check Applications</span></button><button onClick={()=>onNavigate('Announcements')}><Bell/><span>View Announcements</span></button><button onClick={()=>onNavigate('My Profile')}><UserRound/><span>Update Profile</span></button>
        </div></Panel>
      </div>
      <div className="employee-right">
        <Panel title="Your Application Status" action={{label:'View All',onClick:()=>onNavigate('My Applications')}} className="application-status-panel">
          <div className="application-list">{(data?.applications||[]).slice(0,3).map((app)=><div className="application-item" key={app.id}><span className="mini-file"><FileText size={13}/></span><span className="application-name"><b>{app.project}</b><small>{app.remarks||'Application status'}</small></span><StatusBadge value={app.status}/><small>{fmtDate(app.applied_at)}</small></div>)}{!data?.applications?.length&&<div className="empty-message">Your applications will appear here.</div>}</div>
        </Panel>
        <Panel title="Profile Completion" className="profile-progress-panel">
          <div className="profile-completion"><div className="completion-ring" style={{'--completion':`${data?.profileCompletion||0}%`}}><span>{data?.profileCompletion||0}%</span></div><b>Profile Completion</b></div>
          <div className="profile-checks"><span><User size={14}/>Personal Information<Check size={13}/></span><span><Tag size={14}/>Skills & Experience<Check size={13}/></span><span><FileText size={14}/>Documents<Clock3 size={13}/></span><span><Image size={14}/>Profile Photo<Check size={13}/></span></div>
        </Panel>
      </div>
    </div>
    <Panel title="Application Overview" className="employee-application-chart">
      <div className="application-chart-summary"><b>{applicationTotal}</b><span>applications submitted</span></div>
      <div className="application-chart-bar" role="img" aria-label={`Application status: ${applicationCounts.map((item)=>`${item.value} ${item.label}`).join(', ')}`}>
        {applicationCounts.filter((item)=>item.value>0).map((item)=><span key={item.label} style={{'--bar-width':`${applicationTotal?item.value/applicationTotal*100:0}%`,'--bar-color':item.color}} title={`${item.label}: ${item.value}`}/>)}
      </div>
      <div className="application-chart-legend">{applicationCounts.map((item)=><span key={item.label}><i style={{'--legend-color':item.color}}/><b>{item.label}</b><small>{item.value}</small></span>)}</div>
    </Panel>
    <div className="employee-lower-grid">
      <Panel title="Latest Announcements" action={{label:'View All',onClick:()=>onNavigate('Announcements')}} className="employee-announcements-panel">
        <AnnouncementList items={(data?.announcements||[]).slice(0,3)}/>
      </Panel>
      <Panel title="Recent Activity" className="activity-panel">
        <div className="activity-list">{(data?.activity||[]).slice(0,4).map((item)=><div className="activity-item" key={item.id}><span className="activity-dot"><Activity size={13}/></span><span><b>{item.title}</b><small>{item.body}</small><small>{new Date(item.created_at).toLocaleDateString()}</small></span></div>)}{!data?.activity?.length&&<div className="empty-message">No recent activity.</div>}</div>
      </Panel>
      <div className="good-luck"><span>☻</span><div><b>Good Luck!</b><small>Your hard work makes<br/>a difference.</small></div><Sparkles size={24}/></div>
    </div>
    </div>
  </>;
}

function AnnouncementList({ items }) {
  const icons=[Megaphone,CalendarDays,Shield];
  return <div className="announcement-list">{items.map((item,index)=>{const Icon=icons[index%icons.length];return <article key={item.id} className="announcement-item"><span className={`announce-icon announce-${index%3}`}><Icon size={15}/></span><div><b>{item.title}</b><p>{item.body}</p><small><Clock3 size={11}/>{fmtDate(item.publish_at)}</small></div></article>})}{!items.length&&<div className="empty-message">No announcements yet.</div>}</div>;
}
function AnnouncementCards({ items, onNavigate }) {
  return <Panel title="Latest Announcements" action={{label:'View All',onClick:()=>onNavigate('Announcements')}} className="announcement-cards-panel"><div className="announcement-cards">{items.map((item,index)=>{const Icon=[Megaphone,Settings,CircleCheckBig,Users][index%4];return <article key={item.id}><span className={`announce-icon announce-${index%3}`}><Icon size={15}/></span><div><b>{item.title}</b><p>{item.body}</p><small><Clock3 size={11}/>{fmtDate(item.publish_at)}</small></div></article>})}{!items.length&&<div className="empty-message">No announcements yet.</div>}</div></Panel>;
}

