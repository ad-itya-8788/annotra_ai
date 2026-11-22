import React from 'react';
import { LoaderCircle } from 'lucide-react';
import './index.css';

export function ListLoading() {
  return <div className="list-loading" role="status"><LoaderCircle className="spin" size={16}/>Loading records…</div>;
}

export function LoadingScreen() {
  return <div className="loading-screen"><LoaderCircle className="spin" size={28}/><span>Loading your workspace…</span></div>;
}

export function NotFoundPage({ onNavigate }) {
  return <div className="not-found-page"><h1>Page not found</h1><p>The page you requested does not exist.</p><button className="button primary" onClick={onNavigate}>Go to home</button></div>;
}


