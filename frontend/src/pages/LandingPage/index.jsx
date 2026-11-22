import React, { useState } from 'react';
import {
  Activity, ArrowRight, BarChart3, Check, ChevronRight, CircleCheckBig, ClipboardList, FileText,
  FolderClosed, Headphones, Image, LockKeyhole, Menu, MessageSquare, Shield, Sparkles, Tag, UserRound, Users, X,
} from 'lucide-react';
import AnnotationDemo from '../../components/AnnotationDemo/index.jsx';
import './index.css';

const supportEmail = 'annotrai.help@gmail.com';
const communityUrl = 'https://chat.whatsapp.com/Ke6DEqQdD1Q5twaxVUPRf9?s=cl&p=a&mlu=4&ilr=4';

const landingServices = [
  { title: 'Image Annotation', description: 'Bounding boxes, segmentation, keypoints and more.', icon: Image, tags: ['Bounding boxes', 'Segmentation', 'Keypoints'] },
  { title: 'Video Annotation', description: 'Object tracking, frame labeling and action recognition.', icon: Activity, tags: ['Tracking', 'Frame labels', 'Actions'] },
  { title: 'Voice & Audio', description: 'Voice recording, transcription and speaker identification.', icon: Headphones, tags: ['Transcription', 'Speakers', 'Waveforms'] },
  { title: 'Text & Documents', description: 'OCR, text classification and entity labeling.', icon: FileText, tags: ['OCR', 'Classification', 'Entities'] },
  { title: 'Face Annotation', description: 'Face detection, landmarks and expression labeling.', icon: UserRound, tags: ['Detection', 'Landmarks', 'Expressions'] },
  { title: 'LiDAR / 3D Annotation', description: '3D point cloud labeling and object detection.', icon: FolderClosed, tags: ['Point clouds', '3D boxes', 'Detection'] },
];

const steps = [
  { title: 'Understand Your Needs', text: 'We learn about your data, goals and annotation guidelines.', icon: ClipboardList },
  { title: 'Annotate & Review', text: 'Our annotators label your data and reviewers check the work.', icon: Users },
  { title: 'Deliver & Support', text: 'Receive quality-checked data with updates from our team.', icon: BarChart3 },
];

const capabilities = [
  ['Skilled Annotators', 'People trained for your data and guidelines', Users],
  ['Quality Reviewed', 'Careful checks before delivery', Shield],
  ['Flexible Team', 'Capacity that grows with your needs', Sparkles],
  ['Secure Handling', 'Your data stays protected', LockKeyhole],
];

export default function LandingPage({ onLogin }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="landing-page px-site">
      <header className="px-header">
        <div className="px-header-inner">
          <a className="landing-brand px-brand" href="#home" aria-label="Annotra AI home" onClick={closeMenu}>
            <img src="/img/Annotra AI Circular Tech Badge.png" alt="" />
            <span><b>Annotra</b><small>DATA ANNOTATION</small></span>
          </a>
          <nav id="landing-navigation" className={`px-nav ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
            <a className="active" href="#home" aria-current="page" onClick={closeMenu}>Home</a>
            <a href="#services" onClick={closeMenu}>Services</a>
            <a href="#how-it-works" onClick={closeMenu}>How it works</a>
            <a href="#about" onClick={closeMenu}>About us</a>
            <a href="#contact" onClick={closeMenu}>Contact</a>
          </nav>
          <div className="px-header-actions">
            <button className="px-login" type="button" onClick={onLogin}>Team Login</button>
            <a className="landing-start px-quote" href="#contact" onClick={closeMenu}>Get a Quote <ArrowRight size={15} /></a>
            <button className="px-menu-toggle" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="landing-navigation" onClick={() => setMenuOpen((open) => !open)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero px-hero" id="home">
          <div className="px-hero-grid" aria-hidden="true" />
          <div className="px-hero-inner">
            <div className="px-hero-copy">
              <span className="px-pill"><span className="px-pulse" /> AI DATA ANNOTATION SERVICES</span>
              <h1>Turn raw data into <em>AI-ready training data.</em></h1>
              <p>We help businesses prepare reliable training data with skilled annotators, dedicated quality reviewers and a team that scales to your needs.</p>
              <div className="landing-hero-actions px-hero-actions">
                <a className="landing-primary px-primary" href="#services">Explore Our Services <ChevronRight size={16} /></a>
                <a className="landing-secondary px-secondary" href={communityUrl} target="_blank" rel="noopener noreferrer"><MessageSquare size={15} /> Join WhatsApp Community</a>
              </div>
              <div className="px-capability-strip">
                {capabilities.map(([title, text, Icon]) => (
                  <div className="px-capability" key={title}>
                    <span><Icon size={16} /></span>
                    <p><b>{title}</b><small>{text}</small></p>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-hero-visual"><AnnotationDemo /></div>
          </div>
          <div className="px-hero-fade" aria-hidden="true" />
        </section>

        <section className="landing-services landing-section px-services" id="services">
          <div className="px-container">
            <div className="landing-section-heading px-heading">
              <span className="landing-eyebrow px-eyebrow">OUR CAPABILITIES</span>
              <h2>Our <em>Data Annotation Services</em></h2>
              <p>Our experienced team labels and reviews the data that powers AI and machine learning.</p>
            </div>
            <div className="service-grid px-service-grid">
              {landingServices.map(({ title, description, icon: Icon, tags }, index) => (
                <article className="service-card px-service-card" key={title} style={{ '--card-index': index }}>
                  <div className="px-service-art" aria-hidden="true">
                    <span className="px-art-ring" /><span className="px-art-grid" />
                    <Icon size={26} />
                    {index % 2 === 0 && <span className="px-art-node px-art-node-a" />}
                    {index % 3 === 0 && <span className="px-art-node px-art-node-b" />}
                  </div>
                  <div className="service-card-title px-service-title"><span><Icon size={15} /></span><h3>{title}</h3></div>
                  <p>{description}</p>
                  <div className="px-service-tags">{tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div>
                  <a href="#contact">Learn More <ChevronRight size={13} /></a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-how landing-section px-how" id="how-it-works">
          <div className="px-container">
            <div className="landing-section-heading px-heading">
              <span className="landing-eyebrow px-eyebrow">FROM YOUR BRIEF TO QUALITY-CHECKED DATA</span>
              <h2>How We <em>Deliver</em></h2>
              <p>A dedicated Annotra team takes your data through a clear, quality-focused delivery process.</p>
            </div>
            <div className="workflow-steps px-steps">
              {steps.map(({ title, text, icon: Icon }, index) => (
                <React.Fragment key={title}>
                  {index > 0 && <span className="px-step-line" aria-hidden="true"><i /></span>}
                  <article className="px-step" style={{ '--step-index': index }}>
                    <span className="workflow-icon px-step-icon"><Icon size={25} /><i>{index + 1}</i></span>
                    <div><h3>{title}</h3><p>{text}</p></div>
                  </article>
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        <section className="px-assurance landing-section" id="quality">
          <div className="px-container px-assurance-grid">
            <div className="px-assurance-copy">
              <span className="landing-eyebrow px-eyebrow">QUALITY &amp; CONFIDENTIALITY</span>
              <h2>Care at every <em>stage of your data.</em></h2>
              <p>Careful checks and responsible handling are built into the way our team works, from the first annotation to the final delivery.</p>
              <div className="px-assurance-list">
                <div><span><CircleCheckBig size={17} /></span><p><b>Quality checks throughout</b><small>Reviewers check annotation work against your guidelines.</small></p></div>
                <div><span><Shield size={17} /></span><p><b>Clear delivery milestones</b><small>Stay informed as your data moves through the workflow.</small></p></div>
                <div><span><LockKeyhole size={17} /></span><p><b>Secure and responsible handling</b><small>Your data stays protected while our team works on it.</small></p></div>
              </div>
            </div>
            <div className="px-assurance-visual">
              <div className="px-assurance-card px-card-review"><span><Shield size={18} /></span><div><b>Review queue</b><small>Guideline checks in progress</small><i><b /></i></div></div>
              <div className="px-assurance-card px-card-secure"><LockKeyhole size={18} /><div><b>Protected workspace</b><small>Access limited to your team</small></div></div>
              <div className="px-assurance-card px-card-deliver"><span><Check size={18} /></span><div><b>Ready for delivery</b><small>Structured, quality-checked labels</small></div></div>
              <span className="px-assurance-orbit" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="landing-dashboard landing-section px-about" id="about">
          <div className="px-container px-about-grid">
            <div className="dashboard-copy px-about-copy">
              <span className="landing-eyebrow px-eyebrow">PEOPLE, PROCESS &amp; QUALITY</span>
              <h2>A Dedicated Team, <em>Managed with Care</em></h2>
              <p>Behind every delivery is an experienced in-house team, supported by organized workflows and clear quality standards.</p>
              <ul>
                <li><Check size={16} /> Dedicated annotators and reviewers</li>
                <li><Check size={16} /> Clear delivery milestones and updates</li>
                <li><Check size={16} /> Quality checks throughout the process</li>
                <li><Check size={16} /> Flexible capacity for ongoing work</li>
                <li><Check size={16} /> Secure and responsible data handling</li>
              </ul>
              <a className="landing-primary px-primary" href="#contact">Work With Our Team <ChevronRight size={16} /></a>
            </div>
            <div className="dashboard-preview px-about-visual">
              <img src="/img/AI Annotation Dashboard with a Friendly Team.png" alt="Annotra team collaborating on data annotation" loading="lazy" decoding="async" />
              <span className="px-about-badge"><MessageSquare size={14} /> One team, one workflow</span>
            </div>
          </div>
        </section>

        <section className="landing-cta px-cta" id="contact">
          <div className="px-cta-shine" aria-hidden="true" />
          <div className="px-container px-cta-inner">
            <div className="px-cta-copy">
              <span className="landing-eyebrow px-eyebrow">LOOKING FOR A RELIABLE ANNOTATION PARTNER?</span>
              <h2>Let’s Talk About <em>Your Data</em></h2>
              <p>Tell us what you need annotated. We’ll bring the right people and quality process to your data.</p>
              <div className="landing-hero-actions px-hero-actions">
                <a className="landing-primary px-primary" href={`mailto:${supportEmail}?subject=Data%20annotation%20services`}>Email Our Team <ChevronRight size={16} /></a>
                <a className="landing-secondary px-secondary" href={communityUrl} target="_blank" rel="noopener noreferrer"><MessageSquare size={15} /> Join WhatsApp Group</a>
                <button className="landing-secondary px-secondary" type="button" onClick={onLogin}>Team Login</button>
              </div>
              <a className="px-cta-mail" href={`mailto:${supportEmail}`}>{supportEmail} <ArrowRight size={14} /></a>
            </div>
            <div className="px-cta-panel" aria-hidden="true">
              <div className="px-cta-panel-head"><span /><span /><span /> <b>Project brief</b></div>
              <div className="px-cta-line long" /><div className="px-cta-line" /><div className="px-cta-line medium" />
              <div className="px-cta-panel-foot"><span><Tag size={14} /> Images</span><span><Activity size={14} /> Video</span><span><FileText size={14} /> Text</span></div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer px-footer">
        <div className="px-container px-footer-inner">
          <a className="landing-brand px-brand" href="#home" aria-label="Annotra AI home"><img src="/img/Annotra AI Circular Tech Badge.png" alt="" /><span><b>Annotra</b><small>DATA ANNOTATION</small></span></a>
          <p>Skilled people. Reliable data annotation. Quality you can trust.</p>
          <a className="px-footer-email" href={`mailto:${supportEmail}`}>{supportEmail}</a>
          <nav className="px-footer-nav" aria-label="Footer navigation">
            <a href="#services">Services</a><a href="#how-it-works">How it works</a><a href="#about">About</a><a href="#contact">Contact</a>
          </nav>
          <span>© {new Date().getFullYear()} Annotra AI</span>
        </div>
      </footer>
    </div>
  );
}


