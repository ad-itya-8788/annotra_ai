import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import './index.css';

export default function SearchableMultiSelect({ options = [], selected = [], onChange, label, emptyMessage = 'No active employees available.' }) {
  const [search, setSearch] = useState('');
  const matches = options.filter(([, name]) => name.toLowerCase().includes(search.trim().toLowerCase()));
  const selectedOptions = options.filter(([value]) => selected.includes(value));
  const remaining = Math.max(0, 100 - selected.length);
  const toggle = (value, checked) => {
    if(checked&&remaining===0)return;
    onChange(checked ? [...new Set([...selected, value])] : selected.filter((item) => item !== value));
  };
  const selectShown = () => {
    const additions = matches.map(([value]) => value).filter((value) => !selected.includes(value)).slice(0, remaining);
    if(additions.length) onChange([...selected, ...additions]);
  };

  return <div className="searchable-multi-select">
    <div className="employee-picker-toolbar">
      <label className="employee-picker-search">
        <Search size={15}/>
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by employee name or email" aria-label={`Search ${label.toLowerCase()}`}/>
      </label>
      <div className="employee-picker-actions">
        <span>{selected.length} selected · up to 100</span>
        <button type="button" className="text-button" onClick={selectShown} disabled={!matches.length||remaining===0}>Select shown</button>
        <button type="button" className="text-button" onClick={() => onChange([])} disabled={!selected.length}>Clear</button>
      </div>
    </div>
    {selectedOptions.length>0&&<div className="employee-picker-selected" aria-label="Selected employees">
      {selectedOptions.map(([value,name])=><button type="button" className="employee-picker-chip" key={value} onClick={() => toggle(value,false)} title={`Remove ${name}`}>
        <span>{name}</span><X size={13}/>
      </button>)}
    </div>}
    <div className="employee-picker-list" role="group" aria-label={label}>
      {matches.map(([value,name])=><label className="employee-picker-option" key={value}>
        <input type="checkbox" checked={selected.includes(value)} disabled={!selected.includes(value)&&selected.length>=100} onChange={(event) => toggle(value,event.target.checked)}/>
        <span>{name}</span>
      </label>)}
      {!options.length&&<p className="employee-picker-empty">{emptyMessage}</p>}
      {options.length>0&&!matches.length&&<p className="employee-picker-empty">No employees match “{search}”.</p>}
    </div>
  </div>;
}

