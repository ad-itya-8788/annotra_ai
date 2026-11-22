import React from 'react';
import { FolderClosed } from 'lucide-react';
import { fmtDate } from '../../appConfig.js';
import { IconForPage, Panel, StatusBadge } from '../../components/ui/index.jsx';
import './index.css';

export default function ProjectListsPage({ page, items, query, applyingProjectId, onApply }) {
  return <Panel title={page}><div className="available-list standalone">{items.filter((item)=>JSON.stringify(item).toLowerCase().includes(query.toLowerCase())).map((project)=><article className="available-item" key={project.id}><div className="project-symbol"><FolderClosed size={18}/></div><div className="project-details"><b>{project.name||project.project}</b><span>{project.vendor||`Applied ${fmtDate(project.applied_at)}`}</span><div className="skill-tags">{(project.required_skills||[]).map((tag)=><i key={tag}>{tag}</i>)}</div></div>{page==='Available Projects'?<button className={`button small ${project.applied?'applied-button':'primary'}`} disabled={project.applied||applyingProjectId===project.id} onClick={()=>onApply(project.id)}>{project.applied?'Applied':applyingProjectId===project.id?'Applying…':'Apply'}</button>:project.status?<StatusBadge value={project.status}/>:null}</article>)}{!items.length&&<div className="empty-state"><span><IconForPage page={page}/></span><b>Nothing here yet</b><p>No real project records are available for this view yet.</p></div>}</div></Panel>;
}


