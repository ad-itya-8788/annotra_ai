import React from 'react';
import { Activity, Check, FileText, Headphones, Image, ScanLine, Shield, Sparkles, Tag } from 'lucide-react';
import './index.css';

const stages = [
  { label: 'Raw data', detail: 'Unlabeled source', icon: Image },
  { label: 'Annotation', detail: 'Labels & regions', icon: Tag },
  { label: 'Quality review', detail: 'Guideline checks', icon: Shield },
  { label: 'AI-ready data', detail: 'Structured output', icon: Sparkles },
];

const labels = [
  { name: 'Vehicle', color: '#00a86b', width: '82%' },
  { name: 'Pedestrian', color: '#4385ff', width: '64%' },
  { name: 'Road / scene', color: '#704ff5', width: '91%' },
];

const waves = Array.from({ length: 28 }, (_, index) => 22 + Math.round(Math.abs(Math.sin(index * 0.72)) * 26));

export default function AnnotationDemo() {
  return (
    <div className="demo-stage" aria-label="Illustrative data annotation workflow">
      <span className="demo-glow demo-glow-a" aria-hidden="true" />
      <span className="demo-glow demo-glow-b" aria-hidden="true" />

      <div className="demo-window">
        <div className="demo-window-bar">
          <span className="demo-dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="demo-window-title">Annotation workspace</span>
          <span className="demo-window-badge"><i aria-hidden="true" /> Sample preview</span>
        </div>

        <div className="demo-workspace">
          <div className="demo-toolrail" aria-hidden="true">
            <span className="active"><Image size={15} /></span>
            <span><Tag size={15} /></span>
            <span><ScanLine size={15} /></span>
            <span><Activity size={15} /></span>
            <span><Headphones size={15} /></span>
          </div>

          <div className="demo-canvas">
            <svg className="demo-scene" viewBox="0 0 420 250" role="img" aria-label="Illustrative street scene with annotation overlays">
              <defs>
                <linearGradient id="demoSky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e8fbf5" />
                  <stop offset="100%" stopColor="#f7fcff" />
                </linearGradient>
                <linearGradient id="demoRoad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e4ecfa" />
                  <stop offset="100%" stopColor="#f4f7fd" />
                </linearGradient>
                <linearGradient id="demoSeg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#704ff5" stopOpacity=".34" />
                  <stop offset="100%" stopColor="#00b877" stopOpacity=".22" />
                </linearGradient>
              </defs>
              <rect width="420" height="250" rx="10" fill="url(#demoSky)" />
              <circle cx="350" cy="46" r="22" fill="#d6f7e9" />
              <rect x="26" y="62" width="86" height="92" rx="5" fill="#dbe8fb" />
              <rect x="126" y="38" width="92" height="116" rx="5" fill="#e5ecfa" />
              <rect x="232" y="74" width="72" height="80" rx="5" fill="#d9e8f8" />
              <rect x="40" y="78" width="18" height="20" rx="2" fill="#f6fbff" />
              <rect x="72" y="78" width="18" height="20" rx="2" fill="#f6fbff" />
              <rect x="40" y="112" width="18" height="20" rx="2" fill="#f6fbff" />
              <rect x="72" y="112" width="18" height="20" rx="2" fill="#f6fbff" />
              <rect x="144" y="56" width="22" height="24" rx="2" fill="#f6fbff" />
              <rect x="180" y="56" width="22" height="24" rx="2" fill="#f6fbff" />
              <rect x="144" y="94" width="22" height="24" rx="2" fill="#f6fbff" />
              <rect x="180" y="94" width="22" height="24" rx="2" fill="#f6fbff" />
              <rect x="0" y="154" width="420" height="96" fill="url(#demoRoad)" />
              <path d="M0 214 H420" stroke="#fff" strokeWidth="3" strokeDasharray="18 14" opacity=".9" />
              <path d="M0 173 H420" stroke="#dbe5f7" strokeWidth="1.5" />
              <g className="demo-segment">
                <path d="M244 145 L306 145 L320 186 L232 186 Z" fill="url(#demoSeg)" stroke="#00b877" strokeWidth="1.5" strokeDasharray="5 4" />
              </g>
              <g className="demo-car">
                <rect x="252" y="156" width="54" height="24" rx="7" fill="#00a86b" opacity=".9" />
                <rect x="264" y="150" width="28" height="13" rx="5" fill="#86e4c0" />
                <circle cx="266" cy="181" r="5" fill="#17366f" />
                <circle cx="294" cy="181" r="5" fill="#17366f" />
              </g>
              <g className="demo-person">
                <circle cx="122" cy="151" r="7" fill="#4385ff" />
                <rect x="116" y="159" width="12" height="24" rx="5" fill="#4385ff" opacity=".85" />
              </g>
              <g className="demo-box demo-box-car">
                <rect x="242" y="144" width="72" height="45" rx="4" fill="none" stroke="#00a86b" strokeWidth="2" strokeDasharray="7 5" />
                <rect x="242" y="144" width="12" height="12" rx="2" fill="#00a86b" />
                <rect x="302" y="144" width="12" height="12" rx="2" fill="#00a86b" />
                <rect x="242" y="177" width="12" height="12" rx="2" fill="#00a86b" />
                <rect x="302" y="177" width="12" height="12" rx="2" fill="#00a86b" />
              </g>
              <g className="demo-box demo-box-person">
                <rect x="110" y="140" width="25" height="47" rx="4" fill="none" stroke="#4385ff" strokeWidth="2" strokeDasharray="7 5" />
                <rect x="110" y="140" width="9" height="9" rx="2" fill="#4385ff" />
                <rect x="126" y="178" width="9" height="9" rx="2" fill="#4385ff" />
              </g>
              <line className="demo-scanline" x1="0" y1="124" x2="420" y2="124" stroke="#00b877" strokeWidth="1.5" />
            </svg>
            <span className="demo-tag demo-tag-car"><i /> Vehicle <b>0.96</b></span>
            <span className="demo-tag demo-tag-person"><i /> Pedestrian <b>0.91</b></span>
            <span className="demo-cursor" aria-hidden="true"><ScanLine size={17} /></span>
          </div>

          <aside className="demo-inspector">
            <div className="demo-inspector-head"><span>Labels</span><b>3 regions</b></div>
            <div className="demo-label-list">
              {labels.map((item) => (
                <div className="demo-label" key={item.name}>
                  <span><i style={{ background: item.color }} />{item.name}</span>
                  <div><b style={{ width: item.width, background: item.color }} /></div>
                </div>
              ))}
            </div>
            <div className="demo-inspector-divider" />
            <div className="demo-inspector-head"><span>Text entities</span><b>NER</b></div>
            <p className="demo-text-sample">Review <mark>training data</mark> for the <mark>vision model</mark> before delivery.</p>
            <div className="demo-inspector-divider" />
            <div className="demo-inspector-head"><span>Audio track</span><b>00:08</b></div>
            <div className="demo-waveform" aria-hidden="true">
              {waves.map((height, index) => <i key={index} style={{ height: `${height}%`, animationDelay: `${index * 0.055}s` }} />)}
            </div>
          </aside>
        </div>

        <div className="demo-timeline">
          <span className="demo-timeline-label"><Activity size={13} /> Frame 042 / 120</span>
          <div className="demo-timeline-track">
            <i className="demo-frame-marker" /><i className="demo-frame-marker" /><i className="demo-frame-marker" />
            <span className="demo-playhead" />
          </div>
          <span className="demo-timeline-time">00:01:42</span>
        </div>
      </div>

      <div className="demo-float demo-float-a"><span><Check size={15} /></span><div><b>Guideline check passed</b><small>Quality review stage</small></div></div>
      <div className="demo-float demo-float-b"><span><FileText size={15} /></span><div><b>Structured labels</b><small>Ready for model training</small></div></div>

      <div className="demo-workflow" aria-label="Raw data to AI-ready data workflow">
        {stages.map(({ label, detail, icon: Icon }, index) => (
          <div className="demo-stage-item" key={label} style={{ '--stage-index': index }}>
            <span className="demo-stage-icon"><Icon size={16} /></span>
            <span className="demo-stage-copy"><b>{label}</b><small>{detail}</small></span>
            {index < stages.length - 1 && <span className="demo-stage-line" aria-hidden="true"><i /></span>}
          </div>
        ))}
      </div>
      <p className="demo-caption">Illustrative preview of an annotation workflow. Not live processing or customer data.</p>
    </div>
  );
}


