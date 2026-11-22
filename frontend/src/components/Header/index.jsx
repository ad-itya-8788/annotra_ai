import React, { useState } from 'react';
import { Bell, ChevronDown, ChevronRight, Globe2, LogOut, Menu, Search, X } from 'lucide-react';
import './index.css';

export default function Header({ user, page, onMenu, query, setQuery, onLogout, onNotifications, unreadCount }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <header className="topbar">
    <button className="icon-button menu-button" aria-label="Toggle menu" onClick={onMenu}><Menu size={18}/></button>
    <div className="top-breadcrumb" aria-label="Breadcrumb"><span>{user.role}</span><ChevronRight size={12}/><b>{page}</b></div>
    <div className="top-search"><Search size={16}/><input aria-label="Search" placeholder="Search anything..." value={query} onChange={(e)=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')} aria-label="Clear search"><X size={14}/></button>}</div>
    <div className="top-actions">
      <button className="top-icon has-count" aria-label={`Notifications${unreadCount>0?`, ${unreadCount} unread`:''}`} title="Notifications" onClick={onNotifications}><Bell size={17}/>{unreadCount>0&&<i>{Math.min(unreadCount,9)}</i>}</button>
      <span className="language-button" aria-label="Language: English"><Globe2 size={15}/><span>English</span></span>
      <div className="user-menu-wrap" onMouseLeave={()=>setMenuOpen(false)}>
        <button className="user-menu" aria-expanded={menuOpen} aria-haspopup="menu" title="Account menu" onClick={()=>setMenuOpen((open)=>!open)}><span className="avatar">{user.name?.split(' ').map((part)=>part[0]).slice(0,2).join('')}</span><span className="user-label"><b>{user.name}</b><small>{user.role}</small></span><ChevronDown size={13}/></button>
        {menuOpen&&<div className="user-menu-popover" role="menu">
          <div className="user-menu-summary"><b>{user.name}</b><small>{user.mobile||user.role}</small></div>
          <button role="menuitem" onClick={()=>{setMenuOpen(false);onLogout();}}><LogOut size={15}/>Sign out</button>
        </div>}
      </div>
    </div>
  </header>;
}

