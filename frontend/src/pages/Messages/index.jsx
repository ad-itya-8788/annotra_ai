import React from 'react';
import { CircleHelp } from 'lucide-react';
import { Panel } from '../../components/ui/index.jsx';
import './index.css';

export default function MessagesPage({ page, supportEmail }) {
  return <Panel title={page}><div className="empty-state"><span><CircleHelp size={24}/></span><b>{page==='Messages'?'No messages yet':'How can we help?'}</b><p>{page==='Support'?(supportEmail?<>Contact your administrator at <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</>:'Contact your team administrator for account or project support.'):'Updates about applications and projects will appear here.'}</p></div></Panel>;
}


