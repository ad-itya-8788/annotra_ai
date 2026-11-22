import React from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronRight, FileText } from 'lucide-react';
import { pageIcons } from '../../appConfig.js';
import './index.css';

export function StatCard({ title, value, tone, icon: Icon, detail }) {
  return <article className={`stat-card tone-${tone}`}><div className="stat-icon"><Icon size={21}/></div><div className="stat-info"><span>{title}</span><strong>{value??'—'}</strong><small className={detail?.down?'down':''}>{detail?.down?<ArrowDownRight size={14}/>:<ArrowUpRight size={14}/>} {detail?.text||'Updated recently'}</small></div></article>;
}

export function Panel({ title, children, action, className='' }) {
  return <section className={`panel ${className}`}><div className="panel-heading"><h2>{title}</h2>{action&&<button className="view-link" onClick={action.onClick}>{action.label}<ChevronRight size={13}/></button>}</div>{children}</section>;
}

export function StatusBadge({ value }) {
  const key=(value||'').toLowerCase().replaceAll(' ','-');
  return <span className={`status-badge status-${key}`}>{value||'—'}</span>;
}

export function EmptyRow({ colSpan }) { return <tr><td className="table-empty" colSpan={colSpan}>No records found.</td></tr>; }

export function IconForPage({page}){const Icon=pageIcons[page]||FileText;return <Icon size={24}/>;}

