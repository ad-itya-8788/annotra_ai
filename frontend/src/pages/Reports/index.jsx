import React from 'react';
import { BarChart3 } from 'lucide-react';
import { Panel, StatCard } from '../../components/ui/index.jsx';
import './index.css';

export default function ReportsPage({ items }) {
  return <Panel title="Reports overview"><div className="stats-grid report-stats">{items[0]&&Object.entries(items[0]).map(([key,value])=><StatCard key={key} title={key.replaceAll('_',' ')} value={value} tone="blue" icon={BarChart3}/>)}</div></Panel>;
}


