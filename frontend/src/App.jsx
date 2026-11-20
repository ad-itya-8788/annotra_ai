import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, Megaphone, Bell, BriefcaseBusiness, CalendarDays, Check, ChevronDown, ChevronRight, FilePlus2,
  CircleHelp, ClipboardList, Clock3, FileText, FolderClosed, Globe2, Headphones, House,
  Image, LayoutDashboard, LogOut, Mail, Menu, MessageSquare, Plus, Search,
  Settings, Shield, Sparkles, Tag, User, UserRound, Users, X, ArrowUpRight, ArrowDownRight,
  Building2, CircleCheckBig, BarChart3, Send, LoaderCircle, LockKeyhole, Eye, EyeOff, Upload,
} from 'lucide-react';
import { api, setCsrfToken } from './api.js';
import { FormsPage, PublicFormPage } from './Forms.jsx';
import { updatePageMetadata } from './seo.js';

const adminNav = [
  ['Dashboard', LayoutDashboard], ['Employees', Users], ['Projects', FolderClosed], ['Vendors', Building2], ['Forms', FilePlus2],
  ['Applications', ClipboardList], ['Announcements', Megaphone], ['Email Invitations', Mail],
  ['Roles & Permissions', Shield], ['Reports', BarChart3], ['Audit Logs', Activity], ['Settings', Settings],
];
const employeeNav = [
  ['Dashboard', LayoutDashboard], ['My Projects', FolderClosed], ['Available Projects', BriefcaseBusiness],
  ['My Applications', ClipboardList], ['Announcements', Megaphone], ['My Profile', UserRound],
  ['Messages', MessageSquare], ['Support', Headphones], ['Settings', Settings],
];
const teamLeadNav = [['Dashboard', LayoutDashboard], ['Projects', FolderClosed], ['Applications', ClipboardList], ['Announcements', Megaphone], ['Settings', Settings]];
const reviewerNav = [['Dashboard', LayoutDashboard], ['Projects', FolderClosed], ['Announcements', Megaphone], ['Settings', Settings]];
const endpoints = {
  Employees: '/employees', Projects: '/projects', Vendors: '/vendors', Applications: '/applications',
  Announcements: '/announcements', 'Roles & Permissions': '/roles', 'Email Invitations': '/invitations', Notifications:'/notifications',
  'Audit Logs': '/audit-logs',
};
const pageIcons = { Employees: Users, Projects: FolderClosed, Vendors: Building2, Forms: FilePlus2, Applications: ClipboardList, Announcements: Megaphone };
const navPermission = {
  Employees: 'employees.view', Projects: 'projects.view', Vendors: 'vendors.view', Applications: 'applications.view',
  Announcements: 'announcements.view', 'Email Invitations': 'invitations.send',
  Forms: 'forms.manage', 'Roles & Permissions': 'roles.manage', Reports: 'reports.view', 'Audit Logs': 'audit.view',
};
const userHasPermission = (user, code) => user?.role === 'Super Admin' || user?.permissions?.includes(code);
const fmtDate = (value) => value ? new Date(value).toLocaleDateString('en-CA') : '—';
const routePages = [...new Set([
  ...adminNav, ...employeeNav, ...teamLeadNav, ...reviewerNav,
  ['Reports', BarChart3], ['Notifications', Bell],
].map(([label]) => label))];
const routeSlug = (label) => label.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pageFromPath = (pathname) => pathname === '/'
  ? 'Dashboard'
  : routePages.find((label) => `/${routeSlug(label)}` === pathname.replace(/\/+$/, '').toLowerCase()) || null;
const publicFormSlugFromPath = (pathname) => pathname.match(/^\/forms\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/i)?.[1] || null;
const initialEmployeeFilters = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    search: params.get('search') || '',
    roleId: params.get('roleId') || '',
    employeeType: params.get('employeeType') || '',
    status: params.get('status') || '',
    joiningFrom: params.get('joiningFrom') || '',
    joiningTo: params.get('joiningTo') || '',
    sortBy: params.get('sortBy') || 'joiningDate',
    sortDirection: params.get('sortDirection') || 'desc',
    page: Number(params.get('page')) || 1,
    pageSize: Number(params.get('pageSize')) || 25,
  };
};
const initialListFilters = () => {
  const params=new URLSearchParams(window.location.search);
  const activePage=pageFromPath(window.location.pathname);
  return {
    search:params.get('search')||'',status:params.get('status')||'',
    dateFrom:params.get('dateFrom')||'',dateTo:params.get('dateTo')||'',
    vendorId:params.get('vendorId')||'',
    sortBy:params.get('sortBy')||(activePage==='Projects'?'createdAt':activePage==='Vendors'?'name':'appliedAt'),
    sortDirection:params.get('sortDirection')||(activePage==='Vendors'?'asc':'desc'),
    page:Number(params.get('page'))||1,pageSize:Number(params.get('pageSize'))||25,
  };
};

function AuthScreen({ onLogin, onBack }) {
  const [mobile, setMobile] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [highestQualification, setHighestQualification] = useState('');
  const [skills, setSkills] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [city, setCity] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [resume, setResume] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [sent, setSent] = useState(false);
  const [signupSent, setSignupSent] = useState(false);
  const [devBypass, setDevBypass] = useState(false);
  const [view, setView] = useState('login');
  const [loginMethod, setLoginMethod] = useState('otp');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);
  const [otpSeconds, setOtpSeconds] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => setResendSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);
  useEffect(() => {
    if (otpSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => setOtpSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [otpSeconds]);

  function registrationValues() {
    return { fullName, email, mobile, password, confirmPassword, highestQualification, skills, experienceYears, city, linkedinUrl };
  }

  async function passwordLogin(event) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ mobileOrEmail: identifier, password, rememberMe }) });
      setCsrfToken(result.csrfToken);
      onLogin(result.user, result.csrfToken);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function beginSignup(event) {
    event.preventDefault();
    setError(''); setMessage('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!profilePhoto) {
      setError('A profile photo is required to create an account.');
      return;
    }
    if (resume && (resume.size > 5 * 1024 * 1024 || !/\.(pdf|doc|docx)$/i.test(resume.name))) {
      setError('Resume must be a PDF, DOC, or DOCX file no larger than 5 MB.');
      return;
    }
    if (profilePhoto && (profilePhoto.size > 5 * 1024 * 1024 || !/\.(jpe?g|png|webp)$/i.test(profilePhoto.name))) {
      setError('Profile photo must be JPG, PNG, or WebP no larger than 5 MB.');
      return;
    }
    setBusy(true);
    try {
      const result = await api('/auth/register/send-otp', {
        method: 'POST',
        body: JSON.stringify(registrationValues()),
      });
      setSignupSent(true);
      setDevBypass(result.developmentBypass);
      setCode('');
      setResendSeconds(result.resendAfterSeconds || 60);
      setOtpSeconds(result.expiresInSeconds || 300);
      setMessage('');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function resendSignup() {
    setError('');
    if (!profilePhoto) {
      setError('A profile photo is required to create an account.');
      return;
    }
    setBusy(true);
    try {
      const result = await api('/auth/register/send-otp', { method: 'POST', body: JSON.stringify(registrationValues()) });
      setDevBypass(result.developmentBypass);
      setCode('');
      setResendSeconds(result.resendAfterSeconds || 60);
      setOtpSeconds(result.expiresInSeconds || 300);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function finishSignup(event) {
    event.preventDefault();
    setError('');
    if (!profilePhoto) {
      setError('A profile photo is required to create an account.');
      return;
    }
    setBusy(true);
    const form = new FormData();
    form.set('mobile', mobile);
    form.set('code', code);
    if (resume) form.set('resume', resume);
    if (profilePhoto) form.set('profilePhoto', profilePhoto);
    try {
      const result = await api('/auth/register/verify-otp', { method: 'POST', body: form });
      setView('login');
      setSignupSent(false);
      setLoginMethod('otp');
      setPassword(''); setConfirmPassword(''); setCode('');
      setOtpSeconds(0); setResendSeconds(0);
      setMessage(result.message);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function sendCode(event) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await api('/auth/send-otp', { method: 'POST', body: JSON.stringify({ mobile }) });
      setSent(true); setDevBypass(result.developmentBypass);
      setResendSeconds(60); setOtpSeconds(result.expiresInSeconds || 300);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function resendLoginCode() {
    setBusy(true); setError('');
    try {
      const result = await api('/auth/send-otp', { method: 'POST', body: JSON.stringify({ mobile }) });
      setDevBypass(result.developmentBypass);
      setCode('');
      setResendSeconds(60); setOtpSeconds(300);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function verify(event) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const result = await api('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ mobile, code, rememberMe }) });
      setCsrfToken(result.csrfToken);
      onLogin(result.user, result.csrfToken);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <div className="landing-page auth-page">
    <main className="auth-main">
      <section className="auth-intro">
        <span className="landing-eyebrow">ANNOTRA TEAM WORKSPACE</span>
        <h1>Good work starts with a <em>great team.</em></h1>
        <p>Sign in to access your projects, assignments and team updates.</p>
        <div className="auth-hero-image">
          <img src="/img/AI Annotation Workspace with Woman and Dog-4.png" alt="Annotra annotation team at work" />
          <span><Shield size={15}/> Quality-focused. Team-powered.</span>
        </div>
      </section>
      <section className={`auth-card ${view==='signup'?'auth-card-signup':''}`}>
        <div className="auth-card-top">
          <a className="landing-brand auth-card-brand" href="#home" onClick={(event)=>{event.preventDefault();onBack();}} aria-label="Back to Annotra home">
            <img src="/img/Annotra AI Circular Tech Badge.png" alt="" />
            <span><b>Annotra</b><small>DATA ANNOTATION</small></span>
          </a>
          <button className="auth-home-button" type="button" onClick={onBack}><ChevronRight size={13}/> Home</button>
        </div>
        <div className="auth-card-heading">
          <span className="auth-lock-icon"><LockKeyhole size={22}/></span>
          <span className="landing-eyebrow">{view==='signup'?'EMPLOYEE REGISTRATION':'TEAM SIGN IN'}</span>
          <h2>{view==='signup'?(signupSent?'Verify your mobile':'Create your account'):sent?'Verify your number':'Welcome back'}</h2>
          <p>{view==='signup'?(signupSent?'Enter the OTP sent to your mobile to finish registration.':'Your account will be reviewed by an administrator.'):sent?'Enter the one-time code sent to your mobile.':'Sign in to your Annotra AI workspace.'}</p>
        </div>
        {view==='signup' ? signupSent ? <form onSubmit={finishSignup} className="auth-form">
          <label htmlFor="signup-otp">6-digit verification code</label>
          <input id="signup-otp" className="otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" value={code} onChange={(event)=>setCode(event.target.value.replace(/\D/g,''))} required/>
          <small className="otp-expiry">{otpSeconds>0?`Code expires in ${Math.floor(otpSeconds/60)}:${String(otpSeconds%60).padStart(2,'0')}`:'This code has expired. Request a new one.'}</small>
          {resume&&<div className="selected-file"><FileText size={15}/><span><b>{resume.name}</b><small>{(resume.size/1024/1024).toFixed(2)} MB</small></span><button type="button" aria-label="Remove resume" onClick={()=>setResume(null)}><X size={15}/></button></div>}
          {profilePhoto&&<div className="selected-file"><Image size={15}/><span><b>{profilePhoto.name}</b><small>{(profilePhoto.size/1024/1024).toFixed(2)} MB</small></span><button type="button" aria-label="Remove profile photo" onClick={()=>setProfilePhoto(null)}><X size={15}/></button></div>}
          <button className="button primary wide" disabled={busy||otpSeconds===0}>{busy?<LoaderCircle className="spin" size={16}/>:<Check size={16}/>}Verify OTP & Create Account</button>
          <button type="button" className="text-button" disabled={busy||resendSeconds>0} onClick={resendSignup}>{resendSeconds>0?`Resend OTP in ${resendSeconds}s`:'Resend OTP'}</button>
          {devBypass&&<p className="dev-hint">Local development code: <b>000000</b></p>}
          <button type="button" className="text-button" onClick={()=>{setSignupSent(false);setCode('');setError('');}}>Back to registration details</button>
        </form> : <form onSubmit={beginSignup} className="auth-form signup-form">
          <label htmlFor="signup-name">Full Name</label>
          <input id="signup-name" autoComplete="name" placeholder="Enter your full name" value={fullName} maxLength={120} onChange={(event)=>setFullName(event.target.value)} required/>
          <label htmlFor="signup-mobile">Mobile Number</label>
          <div className="mobile-field"><span>+91</span><input id="signup-mobile" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit number" value={mobile} maxLength={10} onChange={(event)=>setMobile(event.target.value.replace(/\D/g,''))} required/></div>
          <label htmlFor="signup-email">Email Address</label>
          <input id="signup-email" type="email" autoComplete="email" placeholder="name@example.com" maxLength={254} value={email} onChange={(event)=>setEmail(event.target.value)} required/>
          <label htmlFor="signup-password">Create Password</label>
          <div className="password-field"><input id="signup-password" type={showPassword?'text':'password'} autoComplete="new-password" placeholder="Create a secure password" minLength={12} maxLength={128} value={password} onChange={(event)=>setPassword(event.target.value)} required/><button type="button" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword((shown)=>!shown)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
          <small className="auth-password-hint">12+ characters, including uppercase, lowercase, and a number.</small>
          <label htmlFor="signup-confirm">Confirm Password</label>
          <div className="password-field"><input id="signup-confirm" type={showConfirmPassword?'text':'password'} autoComplete="new-password" placeholder="Re-enter your password" minLength={12} maxLength={128} value={confirmPassword} onChange={(event)=>setConfirmPassword(event.target.value)} required/><button type="button" aria-label={showConfirmPassword?'Hide password':'Show password'} onClick={()=>setShowConfirmPassword((shown)=>!shown)}>{showConfirmPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
          <label htmlFor="signup-photo">Profile Photo <span className="required-field-indicator" style={{color:'#dc2626'}}>*</span></label>
          <input key={profilePhoto?.name||'profile-photo-empty'} id="signup-photo" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event)=>setProfilePhoto(event.target.files?.[0]||null)}/>
          {profilePhoto&&<div className="selected-file"><Image size={15}/><span><b>{profilePhoto.name}</b><small>{(profilePhoto.size/1024/1024).toFixed(2)} MB</small></span><button type="button" aria-label="Remove profile photo" onClick={()=>setProfilePhoto(null)}><X size={15}/></button></div>}
          <label htmlFor="signup-resume">Resume / CV</label>
          <input key={resume?.name||'resume-empty'} id="signup-resume" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event)=>setResume(event.target.files?.[0]||null)}/>
          <small className="auth-password-hint">PDF, DOC, or DOCX · up to 5 MB</small>
          {resume&&<div className="selected-file"><FileText size={15}/><span><b>{resume.name}</b><small>{(resume.size/1024/1024).toFixed(2)} MB</small></span><button type="button" aria-label="Remove resume" onClick={()=>setResume(null)}><X size={15}/></button></div>}
          <label htmlFor="signup-qualification">Highest Qualification</label>
          <input id="signup-qualification" placeholder="e.g. Bachelor's degree" value={highestQualification} maxLength={120} onChange={(event)=>setHighestQualification(event.target.value)}/>
          <label htmlFor="signup-skills">Skills</label>
          <input id="signup-skills" value={skills} maxLength={1000} placeholder="Separate skills with commas" onChange={(event)=>setSkills(event.target.value)}/>
          <label htmlFor="signup-experience">Previous Work Experience in Years</label>
          <input id="signup-experience" type="number" min="0" max="70" step="0.5" placeholder="Years of experience" value={experienceYears} onChange={(event)=>setExperienceYears(event.target.value)}/>
          <label htmlFor="signup-city">City</label>
          <input id="signup-city" autoComplete="address-level2" maxLength={120} placeholder="Enter your city" value={city} onChange={(event)=>setCity(event.target.value)}/>
          <label htmlFor="signup-linkedin">LinkedIn Profile URL</label>
          <input id="signup-linkedin" type="url" placeholder="https://www.linkedin.com/in/..." maxLength={300} value={linkedinUrl} onChange={(event)=>setLinkedinUrl(event.target.value)}/>
          <button className="button primary wide" disabled={busy}>{busy?<LoaderCircle className="spin" size={16}/>:<Send size={16}/>}Send verification code</button>
          <button type="button" className="text-button" onClick={()=>{setView('login');setSignupSent(false);setError('');setMessage('');}}>Already have an account? Sign in</button>
        </form> : sent ?         <form onSubmit={verify} className="auth-form">
          <label htmlFor="otp">6-digit verification code</label>
          <input id="otp" className="otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" value={code} onChange={(e)=>setCode(e.target.value.replace(/\D/g,''))} required/>
          <small className="otp-expiry">{otpSeconds>0?`Code expires in ${Math.floor(otpSeconds/60)}:${String(otpSeconds%60).padStart(2,'0')}`:'This code has expired. Request a new one.'}</small>
          <div className="auth-remember-row">
            <label className="checkbox-row"><input type="checkbox" checked={rememberMe} onChange={(e)=>setRememberMe(e.target.checked)}/> Remember me</label>
            <span className="auth-remember-duration">For 30 days</span>
          </div>
          <button className="button primary wide" disabled={busy||otpSeconds===0}>{busy?<LoaderCircle className="spin" size={16}/>:<Check size={16}/>}Verify and sign in</button>
          <button type="button" className="text-button" disabled={busy||resendSeconds>0} onClick={resendLoginCode}>{resendSeconds>0?`Resend OTP in ${resendSeconds}s`:'Resend OTP'}</button>
          <button type="button" className="text-button" onClick={()=>{setSent(false);setCode('');setError('');}}>Use a different mobile number</button>
          {devBypass&&<p className="dev-hint">Local development code: <b>000000</b></p>}
        </form> : <>
        <div className="auth-tabs" role="tablist" aria-label="Choose sign-in method">
          <button type="button" role="tab" aria-selected={loginMethod==='password'} className={loginMethod==='password'?'selected':''} onClick={()=>{setLoginMethod('password');setError('');setMessage('');}}>Login with Password</button>
          <button type="button" role="tab" aria-selected={loginMethod==='otp'} className={loginMethod==='otp'?'selected':''} onClick={()=>{setLoginMethod('otp');setSent(false);setError('');setMessage('');}}>Login with OTP</button>
        </div>
          {loginMethod==='otp' ? <form onSubmit={sendCode} className="auth-form">
            <label htmlFor="mobile">Mobile number</label>
            <div className="mobile-field"><span>+91</span><input id="mobile" inputMode="numeric" autoComplete="tel-national" placeholder="Enter 10-digit number" value={mobile} maxLength={10} onChange={(event)=>setMobile(event.target.value.replace(/\D/g,''))} required/></div>
            <div className="auth-remember-row">
              <label className="checkbox-row"><input type="checkbox" checked={rememberMe} onChange={(e)=>setRememberMe(e.target.checked)}/> Remember me</label>
              <span className="auth-remember-duration">For 30 days</span>
            </div>
            <button className="button primary wide" disabled={busy}>{busy?<LoaderCircle className="spin" size={16}/>:<Send size={16}/>}Send OTP</button>
          </form> : <form onSubmit={passwordLogin} className="auth-form">
            <label htmlFor="login-identifier">Mobile number or email address</label>
            <input id="login-identifier" autoComplete="username" placeholder="Mobile number or email" value={identifier} onChange={(event)=>setIdentifier(event.target.value)} required/>
            <label htmlFor="login-password">Password</label>
            <div className="password-field"><input id="login-password" type={showPassword?'text':'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event)=>setPassword(event.target.value)} required/><button type="button" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword((shown)=>!shown)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
            <div className="auth-remember-row">
              <label className="checkbox-row"><input type="checkbox" checked={rememberMe} onChange={(e)=>setRememberMe(e.target.checked)}/> Remember me</label>
              <button type="button" className="text-button" style={{padding:0,fontSize:'10px'}} onClick={()=>{setLoginMethod('otp');setSent(false);setError('');setMessage('');}}>Forgot password?</button>
            </div>
            <button className="button primary wide" disabled={busy}>{busy?<LoaderCircle className="spin" size={16}/>:<LockKeyhole size={16}/>}Sign in</button>
          </form>}
          <button type="button" className="text-button signup-link" onClick={()=>{setView('signup');setSignupSent(false);setError('');setMessage('');}}>Create Account / Register as Employee</button>
        </>}
        {message&&<div className="inline-success" role="status">{message}</div>}
        {error&&<div className="inline-error">{error}</div>}
        <div className="auth-foot"><LockKeyhole size={13}/> Protected with mobile OTP authentication</div>
      </section>
    </main>
    <footer className="auth-footer"><span>© {new Date().getFullYear()} Annotra AI</span><span>Secure access for our team</span></footer>
  </div>;
}

const landingServices = [
  { title: 'Image Annotation', description: 'Bounding boxes, segmentation, keypoints and more.', image: '/img/Image Annotation Street Scene.png', icon: Image },
  { title: 'Video Annotation', description: 'Object tracking, frame labeling and action recognition.', image: '/img/Image Annotation Street Scene-3.png', icon: Activity },
  { title: 'Voice & Audio', description: 'Voice recording, transcription and speaker identification.', image: '/img/AI Annotation Workspace with Dog Companion-5.png', icon: Headphones },
  { title: 'Text & Documents', description: 'OCR, text classification and entity labeling.', image: '/img/emplooye.png', icon: FileText },
  { title: 'Face Annotation', description: 'Face detection, landmarks and expression labeling.', image: '/img/AI Annotation Workspace with Woman and Dog-4.png', icon: UserRound },
  { title: 'LiDAR / 3D Annotation', description: '3D point cloud labeling and object detection.', image: '/img/Image Annotation Street Scene-2.png', icon: FolderClosed },
];

function LandingPage({ onLogin }) {
  return <div className="landing-page">
    <header className="landing-header">
      <a className="landing-brand" href="#home" aria-label="Annotra AI home">
        <img src="/img/Annotra AI Circular Tech Badge.png" alt="" />
        <span><b>Annotra</b><small>DATA ANNOTATION</small></span>
      </a>
      <nav className="landing-nav" aria-label="Main navigation">
        <a className="active" href="#home">Home</a>
        <a href="#services">Services</a>
        <a href="#how-it-works">How it works</a>
        <a href="#about">About us</a>
        <a href="#contact">Contact</a>
      </nav>
      <div className="landing-header-actions">
        <button className="landing-login" onClick={onLogin}>Team Login</button>
        <a className="landing-start" href="#contact">Get a Quote <ChevronRight size={15}/></a>
      </div>
    </header>

    <main>
      <section className="landing-hero" id="home">
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <span className="landing-eyebrow">YOUR DATA ANNOTATION SERVICES PARTNER</span>
            <h1>High-Quality Data Annotation, <em>Delivered by Our Team</em></h1>
            <p>We help businesses prepare reliable training data with skilled annotators, dedicated quality reviewers and a team that scales to your needs.</p>
            <div className="landing-hero-actions">
              <a className="landing-primary" href="#services">Explore Our Services <ChevronRight size={16}/></a>
              <a className="landing-secondary" href="#contact">Talk to Our Team</a>
            </div>
            <div className="landing-benefits">
              <div><span><FolderClosed size={19}/></span><p><b>Skilled Annotators</b><small>People trained for your data and guidelines</small></p></div>
              <div><span><Shield size={19}/></span><p><b>Quality Reviewed</b><small>Careful checks before delivery</small></p></div>
              <div><span><Users size={19}/></span><p><b>Flexible Team</b><small>Capacity that grows with your needs</small></p></div>
              <div><span><LockKeyhole size={19}/></span><p><b>Secure Handling</b><small>Your data stays protected</small></p></div>
            </div>
          </div>
          <div className="landing-hero-visual">
            <div className="hero-visual-glow"/>
            <img className="hero-main-image" src="/img/AI Annotation Workspace with Woman and Dog-4.png" alt="Annotator reviewing image, face, text and 3D labeling work" />
            <div className="hero-note hero-note-top"><span><Image size={15}/></span><b>Image & Video Annotation</b><small>Accurate labels, every frame</small></div>
            <div className="hero-note hero-note-bottom"><span><Shield size={15}/></span><b>Quality you can trust</b><small>Review-ready annotation teams</small></div>
          </div>
        </div>
      </section>

      <section className="landing-services landing-section" id="services">
        <div className="landing-section-heading">
          <span className="landing-eyebrow">OUR CAPABILITIES</span>
          <h2>Our <em>Data Annotation Services</em></h2>
          <p>Our experienced team labels and reviews the data that powers AI and machine learning.</p>
        </div>
        <div className="service-grid">
          {landingServices.map(({ title, description, image, icon: Icon })=><article className="service-card" key={title}>
            <div className="service-card-title"><span><Icon size={18}/></span><h3>{title}</h3></div>
            <img src={image} alt="" loading="lazy"/>
            <p>{description}</p>
            <a href="#contact">Learn More <ChevronRight size={13}/></a>
          </article>)}
        </div>
      </section>

      <section className="landing-how landing-section" id="how-it-works">
        <div className="landing-section-heading">
          <span className="landing-eyebrow">FROM YOUR BRIEF TO QUALITY-CHECKED DATA</span>
          <h2>How We <em>Deliver</em></h2>
          <p>A dedicated Annotra team takes your data through a clear, quality-focused delivery process.</p>
        </div>
        <div className="workflow-steps">
          <article><span className="workflow-icon"><ClipboardList size={29}/><i>1</i></span><div><h3>Understand Your Needs</h3><p>We learn about your data, goals and annotation guidelines.</p></div></article>
          <ChevronRight className="workflow-arrow" size={25}/>
          <article><span className="workflow-icon"><Users size={29}/><i>2</i></span><div><h3>Annotate & Review</h3><p>Our annotators label your data and reviewers check the work.</p></div></article>
          <ChevronRight className="workflow-arrow" size={25}/>
          <article><span className="workflow-icon"><BarChart3 size={29}/><i>3</i></span><div><h3>Deliver & Support</h3><p>Receive quality-checked data with updates from our team.</p></div></article>
        </div>
      </section>

      <section className="landing-dashboard landing-section" id="about">
        <div className="dashboard-copy">
          <span className="landing-eyebrow">PEOPLE, PROCESS & QUALITY</span>
          <h2>A Dedicated Team, <em>Managed with Care</em></h2>
          <p>Behind every delivery is an experienced in-house team, supported by organized workflows and clear quality standards.</p>
          <ul>
            <li><Check size={16}/>Dedicated annotators and reviewers</li>
            <li><Check size={16}/>Clear delivery milestones and updates</li>
            <li><Check size={16}/>Quality checks throughout the process</li>
            <li><Check size={16}/>Flexible capacity for ongoing work</li>
            <li><Check size={16}/>Secure and responsible data handling</li>
          </ul>
          <a className="landing-primary" href="#contact">Work With Our Team <ChevronRight size={16}/></a>
        </div>
        <div className="dashboard-preview">
          <img src="/img/AI Annotation Dashboard with a Friendly Team.png" alt="Annotra team collaborating on data annotation" loading="lazy"/>
        </div>
      </section>

      <section className="landing-cta" id="contact">
        <div>
          <span className="landing-eyebrow">LOOKING FOR A RELIABLE ANNOTATION PARTNER?</span>
          <h2>Let’s Talk About <em>Your Data</em></h2>
          <p>Tell us what you need annotated. We’ll bring the right people and quality process to your data.</p>
          <div className="landing-hero-actions">
            <a className="landing-primary" href="mailto:hello@annotra.ai?subject=Data%20annotation%20services">Discuss Your Needs <ChevronRight size={16}/></a>
            <button className="landing-secondary" onClick={onLogin}>Team Login</button>
          </div>
        </div>
        <img src="/img/AI Annotation Workspace with Woman and Dog-4.png" alt="" loading="lazy"/>
      </section>
    </main>
    <footer className="landing-footer">
      <a className="landing-brand" href="#home"><img src="/img/Annotra AI Circular Tech Badge.png" alt=""/><span><b>Annotra</b><small>DATA ANNOTATION</small></span></a>
      <p>Skilled people. Reliable data annotation. Quality you can trust.</p>
      <span>© {new Date().getFullYear()} Annotra AI</span>
    </footer>
  </div>;
}

function Sidebar({ user, active, onNavigate, collapsed, setCollapsed, onLogout, workspaceName, supportEmail }) {
  const annotator = user.role === 'Annotator';
  const roleLinks = user.role === 'Reviewer' ? reviewerNav : user.role === 'Team Lead' ? teamLeadNav : adminNav;
  const links = (annotator ? employeeNav : roleLinks).filter(([label])=>!navPermission[label]||userHasPermission(user,navPermission[label]));
  return <>
    <aside className={`sidebar ${collapsed?'collapsed':''}`}>
      <div className="brand-lockup sidebar-brand"><span className="brand-mark"><img src="/img/Annotra AI Circular Tech Badge.png" alt=""/></span><span className="brand-text"><b>{workspaceName||'Annotra AI'}</b><small>Team Management Workspace</small></span></div>
      <nav className="sidebar-nav">
        {links.map(([label,Icon])=><button key={label} className={`nav-link ${active===label?'selected':''}`} onClick={()=>onNavigate(label)} title={label}><Icon size={17}/><span>{label}</span>{label==='Announcements'&&annotator&&<i className="nav-count">2</i>}</button>)}
        <button className="nav-link" onClick={onLogout} title="Logout"><LogOut size={17}/><span>Logout</span></button>
      </nav>
      {supportEmail?<a className="help-card" href={`mailto:${supportEmail}`}><span className="help-icon"><Headphones size={17}/></span><div><b>Need Help?</b><small>Contact {supportEmail}<br/>for support.</small></div><ChevronRight size={14}/></a>:<div className="help-card"><span className="help-icon"><Headphones size={17}/></span><div><b>Need Help?</b><small>Contact your admin<br/>for support.</small></div><ChevronRight size={14}/></div>}
    </aside>
  </>;
}

function Header({ user, onMenu, query, setQuery, onLogout, onNotifications, unreadCount }) {
  return <header className="topbar">
    <button className="icon-button menu-button" aria-label="Toggle menu" onClick={onMenu}><Menu size={18}/></button>
    <div className="top-search"><Search size={16}/><input aria-label="Search" placeholder="Search anything..." value={query} onChange={(e)=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')} aria-label="Clear search"><X size={14}/></button>}</div>
    <div className="top-actions">
      <button className="top-icon has-count" title="Notifications" onClick={onNotifications}><Bell size={17}/>{unreadCount>0&&<i>{Math.min(unreadCount,9)}</i>}</button>
      <button className="language-button"><Globe2 size={15}/><span>English</span><ChevronDown size={13}/></button>
      <button className="user-menu" onClick={onLogout} title="Sign out"><span className="avatar">{user.name?.split(' ').map((part)=>part[0]).slice(0,2).join('')}</span><span className="user-label"><b>{user.name}</b><small>{user.role}</small></span><ChevronDown size={13}/></button>
    </div>
  </header>;
}

function Welcome({ user, employee, dismiss, onDismiss, workspaceName }) {
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

function StatCard({ title, value, tone, icon: Icon, detail }) {
  return <article className={`stat-card tone-${tone}`}><div className="stat-icon"><Icon size={21}/></div><div className="stat-info"><span>{title}</span><strong>{value??'—'}</strong><small className={detail?.down?'down':''}>{detail?.down?<ArrowDownRight size={14}/>:<ArrowUpRight size={14}/>} {detail?.text||'Updated recently'}</small></div></article>;
}

function Panel({ title, children, action, className='' }) {
  return <section className={`panel ${className}`}><div className="panel-heading"><h2>{title}</h2>{action&&<button className="view-link" onClick={action.onClick}>{action.label}<ChevronRight size={13}/></button>}</div>{children}</section>;
}

function StatusBadge({ value }) {
  const key=(value||'').toLowerCase().replaceAll(' ','-');
  return <span className={`status-badge status-${key}`}>{value||'—'}</span>;
}

function AdminDashboard({ data, permissions, onNavigate }) {
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
          ['invitations.send','Email Invitations','Send Invitations',Mail,'orange'],
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

function TeamDashboard({ data, user, onNavigate }) {
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

function EmployeeDashboard({ data, onNavigate, onApply }) {
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
function EmptyRow({ colSpan }) { return <tr><td className="table-empty" colSpan={colSpan}>No records found.</td></tr>; }

function DataPage({ page, items, query, onCreate, onReview, onToggle, onReviewEmployee, onAssignRole, onEdit, onDelete, roles, vendors, employeeTypes, filters, pagination, onApplyEmployeeFilters, onApplyFilters, canApproveEmployees, canAssignRoles, canCreate, canEditEmployees, user }) {
  const Icon=pageIcons[page]||FileText;
  const [draftFilters,setDraftFilters]=useState(filters||{});
  useEffect(()=>setDraftFilters(filters||{}),[filters]);
  const filtered=useMemo(()=>page==='Employees'?items:items.filter((row)=>JSON.stringify(row).toLowerCase().includes(query.toLowerCase())),[items,query,page]);
  const applyFilters=page==='Employees'?onApplyEmployeeFilters:onApplyFilters;
  const columns={
    Employees:[['profile_photo_url','Photo'],['full_name','Employee'],['email','Email'],['mobile','Mobile'],['highest_qualification','Qualification'],['city','City'],['role','Role'],['resume_url','Resume'],['status','Status']],
    Projects:[['name','Project Name'],['code','Code'],['vendor','Vendor'],['status','Status'],['application_deadline','Deadline']],
    Vendors:[['company_name','Vendor'],['contact_person','Contact Person'],['email','Email'],['mobile','Mobile'],['status','Status']],
    Applications:[['employee','Employee'],['project','Project'],['applied_at','Applied On'],['status','Status'],['remarks','Remarks']],
    Announcements:[['title','Announcement'],['priority','Priority'],['publish_at','Publish Date'],['is_published','Status']],
    'Roles & Permissions':[['name','Role'],['description','Description'],['permissions','Permissions']],
    'Email Invitations':[['employee','Employee'],['email','Email'],['project','Project'],['subject','Subject'],['status','Status'],['created_at','Sent On']],
    Notifications:[['title','Notification'],['body','Details'],['kind','Type'],['created_at','Date'],['read_at','Read']],
    'Audit Logs':[['action','Activity'],['actor','By'],['target','Employee'],['details','Details'],['created_at','Date']],
  }[page]||[];
  const description=page==='Employees'
    ? 'Approve registrations, manage account status, and assign authorized roles.'
    : page==='Roles & Permissions'
      ? 'Create role profiles and choose which permissions each role receives.'
      : `Manage your ${page.toLowerCase()} and keep project work moving.`;
  const updateFilter=(key,value)=>setDraftFilters((current)=>({...current,[key]:value}));
  const submitFilters=(event)=>{event.preventDefault();onApplyEmployeeFilters({...draftFilters,page:1});};
  return <Panel title={`${page}`} action={canCreate?{label:`Add ${page==='Employees'?'Employee':page==='Projects'?'Project':page==='Vendors'?'Vendor':'Announcement'}`,onClick:onCreate}:null} className="resource-panel">
    <div className="resource-summary"><span className="resource-icon"><Icon size={19}/></span><span><b>{pagination?.total??filtered.length} {page.toLowerCase()}</b><small>{description}</small></span></div>
    {page==='Employees'&&<form className="filter-toolbar employee-filter-toolbar" onSubmit={submitFilters}>
      <label className="filter-search"><span>Search employees</span><input type="search" placeholder="Name, mobile, email, or employee ID" value={draftFilters.search||''} onChange={(event)=>updateFilter('search',event.target.value)}/></label>
      <label><span>Role</span><select value={draftFilters.roleId||''} onChange={(event)=>updateFilter('roleId',event.target.value)}><option value="">All roles</option>{roles.map((role)=><option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
      <label><span>Employee type</span><select value={draftFilters.employeeType||''} onChange={(event)=>updateFilter('employeeType',event.target.value)}><option value="">All types</option>{employeeTypes.map((type)=><option key={type} value={type}>{type}</option>)}</select></label>
      <label><span>Account / approval status</span><select value={draftFilters.status||''} onChange={(event)=>updateFilter('status',event.target.value)}><option value="">All statuses</option><option value="pending">Pending approval</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="rejected">Rejected</option></select></label>
      <label><span>Joined from</span><input type="date" value={draftFilters.joiningFrom||''} onChange={(event)=>updateFilter('joiningFrom',event.target.value)}/></label>
      <label><span>Joined to</span><input type="date" value={draftFilters.joiningTo||''} onChange={(event)=>updateFilter('joiningTo',event.target.value)}/></label>
      <label><span>Sort by</span><select value={draftFilters.sortBy||'joiningDate'} onChange={(event)=>updateFilter('sortBy',event.target.value)}><option value="joiningDate">Joining date</option><option value="name">Name</option><option value="email">Email</option><option value="mobile">Mobile</option><option value="role">Role</option><option value="status">Status</option></select></label>
      <label><span>Order</span><select value={draftFilters.sortDirection||'desc'} onChange={(event)=>updateFilter('sortDirection',event.target.value)}><option value="desc">Descending</option><option value="asc">Ascending</option></select></label>
      <div className="filter-actions"><button className="button primary small" type="submit">Apply Filters</button><button className="button secondary small" type="button" onClick={()=>{const reset={search:'',roleId:'',employeeType:'',status:'',joiningFrom:'',joiningTo:'',sortBy:'joiningDate',sortDirection:'desc',page:1,pageSize:25};setDraftFilters(reset);onApplyEmployeeFilters(reset);}}>Reset Filters</button><button className="text-button" type="button" onClick={()=>{const clear={...filters,search:'',roleId:'',employeeType:'',status:'',joiningFrom:'',joiningTo:'',page:1};setDraftFilters(clear);onApplyEmployeeFilters(clear);}}>Clear All</button></div>
    </form>}
    {['Projects','Vendors','Applications'].includes(page)&&<form className="filter-toolbar listing-filter-toolbar" onSubmit={(event)=>{event.preventDefault();applyFilters({...draftFilters,page:1});}}>
      <label className="filter-search"><span>Search {page.toLowerCase()}</span><input type="search" placeholder={page==='Applications'?'Employee or project name/email':'Name, code, or contact details'} value={draftFilters.search||''} onChange={(event)=>updateFilter('search',event.target.value)}/></label>
      <label><span>Status</span><select value={draftFilters.status||''} onChange={(event)=>updateFilter('status',event.target.value)}><option value="">All statuses</option>{(page==='Projects'?['Draft','Published','In Progress','Completed','On Hold','Cancelled']:page==='Applications'?['Pending','Approved','Rejected','Withdrawn']:['active','inactive']).map((status)=><option key={status} value={status}>{status}</option>)}</select></label>
      {page==='Projects'&&<><label><span>Vendor</span><select value={draftFilters.vendorId||''} onChange={(event)=>updateFilter('vendorId',event.target.value)}><option value="">All vendors</option>{vendors.map((vendor)=><option key={vendor.id} value={vendor.id}>{vendor.company_name}</option>)}</select></label><label><span>Start date from</span><input type="date" value={draftFilters.dateFrom||''} onChange={(event)=>updateFilter('dateFrom',event.target.value)}/></label><label><span>Start date to</span><input type="date" value={draftFilters.dateTo||''} onChange={(event)=>updateFilter('dateTo',event.target.value)}/></label><label><span>Sort by</span><select value={draftFilters.sortBy||'createdAt'} onChange={(event)=>updateFilter('sortBy',event.target.value)}><option value="createdAt">Created date</option><option value="name">Name</option><option value="status">Status</option><option value="vendor">Vendor</option><option value="startDate">Start date</option></select></label></>}
      {page==='Vendors'&&<><label><span>Created from</span><input type="date" value={draftFilters.dateFrom||''} onChange={(event)=>updateFilter('dateFrom',event.target.value)}/></label><label><span>Created to</span><input type="date" value={draftFilters.dateTo||''} onChange={(event)=>updateFilter('dateTo',event.target.value)}/></label><label><span>Sort by</span><select value={draftFilters.sortBy||'name'} onChange={(event)=>updateFilter('sortBy',event.target.value)}><option value="name">Company name</option><option value="status">Status</option><option value="createdAt">Created date</option></select></label></>}
      {page==='Applications'&&<><label><span>Applied from</span><input type="date" value={draftFilters.dateFrom||''} onChange={(event)=>updateFilter('dateFrom',event.target.value)}/></label><label><span>Applied to</span><input type="date" value={draftFilters.dateTo||''} onChange={(event)=>updateFilter('dateTo',event.target.value)}/></label><label><span>Sort by</span><select value={draftFilters.sortBy||'appliedAt'} onChange={(event)=>updateFilter('sortBy',event.target.value)}><option value="appliedAt">Applied date</option><option value="status">Status</option><option value="employee">Employee</option><option value="project">Project</option></select></label></>}
      <label><span>Order</span><select value={draftFilters.sortDirection||'desc'} onChange={(event)=>updateFilter('sortDirection',event.target.value)}><option value="desc">Descending</option><option value="asc">Ascending</option></select></label>
      <div className="filter-actions"><button className="button primary small" type="submit">Apply Filters</button><button className="button secondary small" type="button" onClick={()=>{const reset={search:'',status:'',vendorId:'',dateFrom:'',dateTo:'',sortBy:page==='Projects'?'createdAt':page==='Vendors'?'name':'appliedAt',sortDirection:page==='Vendors'?'asc':'desc',page:1,pageSize:25};setDraftFilters(reset);applyFilters(reset);}}>Reset Filters</button><button className="text-button" type="button" onClick={()=>{const clear={...filters,search:'',status:'',vendorId:'',dateFrom:'',dateTo:'',page:1};setDraftFilters(clear);applyFilters(clear);}}>Clear All</button></div>
    </form>}
    <div className="table-scroll resource-table"><table><thead><tr>{columns.map(([,label])=><th key={label}>{label}</th>)}            {['Applications','Employees','Projects','Vendors','Announcements','Roles & Permissions','Notifications'].includes(page)&&<th>Actions</th>}</tr></thead><tbody>
      {filtered.map((row,index)=><tr key={row.id||index}>{columns.map(([key])=><td key={key}>{key==='details'&&page==='Audit Logs'?<code className="audit-details">{row[key]&&typeof row[key]==='object'?JSON.stringify(row[key]):row[key]||'-'}</code>:key==='status'||key==='priority'?<StatusBadge value={row[key]===true?'Published':row[key]===false?'Draft':row[key]}/>:key==='profile_photo_url'?row[key]?<img className="employee-table-photo" src={row[key]} alt={`${row.full_name} profile`}/>:<span className="muted">-</span>:key==='resume_url'?row[key]?<a className="resume-link" href={row[key]} target="_blank" rel="noreferrer">View / Download</a>:<span className="muted">-</span>:key==='linkedin_url'?row[key]?<a href={row[key]} target="_blank" rel="noreferrer">Profile</a>:<span className="muted">-</span>:key==='skills'||key==='permissions'?Array.isArray(row[key])?row[key].join(', '):row[key]:key.endsWith('_at')||key==='application_deadline'||key==='start_date'||key==='end_date'||key==='publish_at'||key==='expires_at'||key==='created_at'||key==='joiningDate'?fmtDate(row[key]):row[key]??'-'}</td>)}
        {['Applications','Employees'].includes(page)&&<td className="actions-cell">{page==='Applications'&&row.status==='Pending'?<><button className="mini-action approve" onClick={()=>onReview(row,'Approved')}>Approve</button><button className="mini-action reject" onClick={()=>onReview(row,'Rejected')}>Reject</button>{(canEditEmployees||canCreate)&&<button className="mini-action" onClick={()=>onEdit(row)}>Edit</button>}</>:page==='Employees'?<>{row.status==='pending'&&canApproveEmployees?<><button className="mini-action approve" onClick={()=>onReviewEmployee(row,'active')}>Approve</button><button className="mini-action reject" onClick={()=>onReviewEmployee(row,'rejected')}>Reject</button></>:['active','inactive'].includes(row.status)&&<button className="mini-action" onClick={()=>onToggle(row)}>{row.status==='active'?'Deactivate':'Activate'}</button>}{canAssignRoles&&row.status!=='pending'&&row.role!=='Super Admin'&&<select className="role-select" value={row.role_id} onChange={(ev)=>onAssignRole(row,ev.target.value)}>{roles.filter((r)=>r.name!=='Super Admin').map((r)=><option key={r.id} value={r.id}>{r.name}</option>)}</select>}{(canEditEmployees||canCreate)&&<button className="mini-action" onClick={()=>onEdit(row)}>Edit</button>}</>:null}</td>}
        {page==='Roles & Permissions'&&<td className="actions-cell">{row.name==='Super Admin'?<span className="muted">Protected</span>:<><button className="mini-action" onClick={()=>onEdit(row)}>Edit</button><button className="mini-action reject" onClick={()=>onDelete(row)}>Delete</button></>}</td>}
        {page==='Projects'&&<td className="actions-cell"><button className="mini-action" onClick={()=>onEdit(row)}>Edit</button></td>}
        {page==='Vendors'&&<td className="actions-cell"><button className="mini-action" onClick={()=>onEdit(row)}>Edit</button></td>}
        {page==='Announcements'&&<td className="actions-cell"><>{(user?.permissions?.includes('announcements.publish')||user?.role==='Super Admin')&&<button className="mini-action" onClick={()=>onToggle(row)}>{row.is_published?'Unpublish':'Publish'}</button>}<button className="mini-action" onClick={()=>onEdit(row)}>Edit</button></></td>}
        {page==='Notifications'&&<td><button className="mini-action" disabled={Boolean(row.read_at)} onClick={()=>onToggle(row)}>{row.read_at?'Read':'Mark read'}</button></td>}
      </tr>)}
      {!filtered.length&&<EmptyRow colSpan={columns.length+(['Applications','Employees','Projects','Vendors','Announcements','Roles & Permissions','Notifications'].includes(page)?1:0)}/>}
    </tbody></table></div>
    {['Employees','Projects','Vendors','Applications'].includes(page)&&pagination&&<div className="pagination-bar"><span>Showing {pagination.total?((pagination.page-1)*pagination.pageSize)+1:0}–{Math.min(pagination.page*pagination.pageSize,pagination.total)} of {pagination.total} {page.toLowerCase()}</span><label>Rows per page<select value={pagination.pageSize} onChange={(event)=>applyFilters({...filters,page:1,pageSize:Number(event.target.value)})}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label><div><button className="button secondary small" disabled={pagination.page<=1} onClick={()=>applyFilters({...filters,page:pagination.page-1})}>Previous</button><span>Page {pagination.page} of {Math.max(1,pagination.totalPages)}</span><button className="button secondary small" disabled={pagination.page>=pagination.totalPages} onClick={()=>applyFilters({...filters,page:pagination.page+1})}>Next</button></div></div>}
    {page==='Email Invitations'&&<p className="muted invite-note">Choose a project and employees to send a separate email invitation. An invitation does not submit a project application.</p>}
  </Panel>;
}

function RolePermissionsPage({ roles, permissions, currentUser, onCreate, onSave, busy }) {
  const [selectedId,setSelectedId]=useState('');
  const [roleSearch,setRoleSearch]=useState('');
  const [moduleSearch,setModuleSearch]=useState('');
  const [draft,setDraft]=useState(null);
  const [editing,setEditing]=useState(false);
  const [message,setMessage]=useState('');
  const role=roles.find((item)=>item.id===selectedId)||null;
  const canManage=currentUser.role==='Super Admin'||currentUser.permissions?.includes('roles.manage');
  const canGrant=(code)=>currentUser.role==='Super Admin'||currentUser.permissions?.includes(code);

  useEffect(()=>{
    if(!roles.length)return;
    if(!selectedId||!roles.some((item)=>item.id===selectedId)){
      const initial=roles[0];
      setSelectedId(initial.id);
      setRoleSearch(initial.name);
      setDraft({name:initial.name,description:initial.description,permissions:[...initial.permissions]});
      setEditing(false);
    }
  },[roles,selectedId]);
  useEffect(()=>{
    if(!role)return;
    setRoleSearch(role.name);
    setDraft({name:role.name,description:role.description,permissions:[...role.permissions]});
    setEditing(false);
    setMessage('');
  },[selectedId,role?.name,role?.description,role?.permissions]);

  const modules=useMemo(()=>{
    const groups=new Map();
    for(const item of permissions){
      const [key,action='access']=item.code.split('.');
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push({code:item.code,action,description:item.description});
    }
    return [...groups.entries()].map(([key,items])=>({
      key,
      label:key.replaceAll('_',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase()),
      items:items.sort((a,b)=>a.action.localeCompare(b.action)),
    })).filter((module)=>`${module.label} ${module.items.map((item)=>item.code).join(' ')}`.toLowerCase().includes(moduleSearch.toLowerCase()));
  },[permissions,moduleSearch]);

  const dirty=Boolean(role&&draft&&(draft.name!==role.name||draft.description!==role.description
    ||[...draft.permissions].sort().join('|')!==[...role.permissions].sort().join('|')));
  const changeRole=(id)=>{
    if(!id||id===selectedId)return;
    if(dirty&&!window.confirm('Discard unsaved permission changes and switch roles?'))return;
    const next=roles.find((item)=>item.id===id);
    setSelectedId(id);
    setRoleSearch(next?.name||'');
  };
  const togglePermission=(code,checked)=>{
    if(!canGrant(code))return;
    setDraft((current)=>({...current,permissions:checked
      ?[...new Set([...current.permissions,code])]
      :current.permissions.filter((item)=>item!==code)}));
  };
  const toggleModule=(module,checked)=>{
    const allowed=module.items.filter((item)=>canGrant(item.code)).map((item)=>item.code);
    setDraft((current)=>({...current,permissions:checked
      ?[...new Set([...current.permissions,...allowed])]
      :current.permissions.filter((code)=>!allowed.includes(code))}));
  };
  const save=async()=>{
    if(!role||!draft||!dirty)return;
    if(!window.confirm(`Save permissions for ${role.name}?`))return;
    const saved=await onSave({...role,name:draft.name.trim(),description:draft.description},draft.permissions);
    if(saved){setEditing(false);setMessage('Permissions saved successfully.');}
  };

  return <section className="role-permissions-page">
    <div className="role-page-heading"><div><span className="eyebrow">ACCESS CONTROL</span><h2>Role &amp; Permissions</h2><p>Select a role, then tick the permissions it should have across each module.</p></div>{canManage&&<button className="button primary" onClick={onCreate}><Plus size={15}/>Add Role</button>}</div>
    <Panel title="Role setup" className="role-control-panel">
      <div className="role-controls">
        <label><span>Search and select role</span><input list="available-roles" value={roleSearch} placeholder="Type a role name to find it" onChange={(event)=>{setRoleSearch(event.target.value);const match=roles.find((item)=>item.name.toLowerCase()===event.target.value.toLowerCase());if(match)changeRole(match.id);}}/><datalist id="available-roles">{roles.map((item)=><option key={item.id} value={item.name}/>)}</datalist></label>
        <label><span>Role</span><select value={selectedId} onChange={(event)=>changeRole(event.target.value)}><option value="">Select a role</option>{roles.map((item)=><option key={item.id} value={item.id}>{item.name}{item.name==='Super Admin'?' (Protected)':''}</option>)}</select></label>
        {editing&&role?.name!=='Super Admin'&&<label><span>Role name</span><input value={draft?.name||''} maxLength={100} placeholder="Enter a role name" onChange={(event)=>setDraft((current)=>({...current,name:event.target.value}))}/></label>}
        {editing&&<label className="role-description-field"><span>Description</span><input value={draft?.description||''} maxLength={500} placeholder="Describe this role's responsibilities" onChange={(event)=>setDraft((current)=>({...current,description:event.target.value}))}/></label>}
        <div className="role-control-actions">{canManage&&role?.name!=='Super Admin'&&<button className="button secondary small" onClick={()=>setEditing((value)=>!value)} disabled={!role}>{editing?'Done editing':'Edit Role'}</button>}{canManage&&<button className="button secondary small" disabled={!draft||!role||role.name==='Super Admin'||!permissions.length} onClick={()=>setDraft((current)=>({...current,permissions:[...new Set([...current.permissions,...permissions.map((item)=>item.code).filter(canGrant)])]}))}>Select All</button>}{canManage&&<button className="button secondary small" disabled={!draft||!role||role.name==='Super Admin'} onClick={()=>setDraft((current)=>({...current,permissions:current.permissions.filter((code)=>!permissions.some((item)=>item.code===code&&canGrant(code)))}))}>Clear All</button>}{canManage&&<button className="button primary small" disabled={!dirty||busy||role?.name==='Super Admin'} onClick={save}>{busy?<LoaderCircle className="spin" size={14}/>:<Check size={14}/>}Save Permissions</button>}</div>
      </div>
      <div className="role-matrix-toolbar"><div><b>{role?.name||'Choose a role'}</b><span>{draft?.permissions.length||0} permissions selected</span></div><input type="search" placeholder="Search modules or permission names" value={moduleSearch} onChange={(event)=>setModuleSearch(event.target.value)}/></div>
      {message&&<div className="inline-success" role="status">{message}</div>}
      {!canManage&&<div className="empty-message">You have view-only access to role permissions.</div>}
      <div className="role-matrix-scroll"><table className="role-matrix"><thead><tr><th>Module</th><th><label className="matrix-module-check">Module all<input aria-label="Select all permissions for every module" type="checkbox" checked={Boolean(permissions.length&&permissions.filter((item)=>canGrant(item.code)).every((item)=>draft?.permissions.includes(item.code)))} disabled={!canManage||role?.name==='Super Admin'} onChange={(event)=>setDraft((current)=>({...current,permissions:event.target.checked?[...new Set([...current.permissions,...permissions.map((item)=>item.code).filter(canGrant)])]:current.permissions.filter((code)=>!permissions.some((item)=>item.code===code&&canGrant(code)))}))}/></label></th>{[...new Set(permissions.map((item)=>item.code.split('.')[1]||'access'))].sort().map((action)=><th key={action}>{action.replaceAll('_',' ')}</th>)}</tr></thead><tbody>
        {modules.map((module)=><tr key={module.key}><th scope="row">{module.label}</th><td><label className="matrix-check"><input aria-label={`Select all ${module.label} permissions`} type="checkbox" checked={Boolean(module.items.filter((item)=>canGrant(item.code)).length&&module.items.filter((item)=>canGrant(item.code)).every((item)=>draft?.permissions.includes(item.code)))} disabled={!canManage||role?.name==='Super Admin'||!module.items.some((item)=>canGrant(item.code))} onChange={(event)=>toggleModule(module,event.target.checked)}/><span>All</span></label></td>{[...new Set(permissions.map((item)=>item.code.split('.')[1]||'access'))].sort().map((action)=>{const item=module.items.find((entry)=>entry.action===action);return <td key={action}>{item?<label className={`matrix-check ${canGrant(item.code)?'':'unavailable'}`} title={canGrant(item.code)?item.description:'You cannot grant a permission you do not have'}><input type="checkbox" aria-label={`${module.label} ${action}`} checked={Boolean(draft?.permissions.includes(item.code))} disabled={!canManage||!canGrant(item.code)||role?.name==='Super Admin'} onChange={(event)=>togglePermission(item.code,event.target.checked)}/><span>{draft?.permissions.includes(item.code)?'Granted':canGrant(item.code)?'Denied':'Unavailable'}</span></label>:<span className="permission-unavailable">—</span>}</td>;})}</tr>)}
        {!modules.length&&<tr><td className="table-empty" colSpan={20}>No modules match this search.</td></tr>}
      </tbody></table></div>
      {dirty&&<p className="unsaved-warning">You have unsaved permission changes. Save them or they will be lost when you leave this role.</p>}
    </Panel>
  </section>;
}

function SettingsPage({ settings, preferences, canManageSettings, onSaveSettings, onSavePreferences, busy }) {
  const [system, setSystem] = useState(settings);
  const [personal, setPersonal] = useState(preferences);

  useEffect(() => setSystem(settings), [settings]);
  useEffect(() => setPersonal(preferences), [preferences]);

  return <div className="settings-grid">
    <Panel title="Workspace settings" className="settings-panel">
      {canManageSettings ? <form className="settings-form" onSubmit={(event) => { event.preventDefault(); onSaveSettings(system); }}>
        <label htmlFor="workspace-name">Workspace name</label>
        <input id="workspace-name" maxLength={120} placeholder="Annotra AI" value={system.workspaceName||''} onChange={(event) => setSystem((current) => ({...current,workspaceName:event.target.value}))} required/>
        <label htmlFor="support-email">Support email</label>
        <input id="support-email" type="email" maxLength={254} placeholder="support@example.com" value={system.supportEmail||''} onChange={(event) => setSystem((current) => ({...current,supportEmail:event.target.value}))}/>
        <p>Workspace name and support contact are shared with all employees.</p>
        <button className="button primary" disabled={busy}>{busy?<LoaderCircle className="spin" size={15}/>:<Check size={15}/>}Save workspace settings</button>
      </form> : <div className="settings-readonly">
        <p><b>Workspace:</b> {settings.workspaceName||'Annotra AI'}</p>
        <p><b>Support:</b> {settings.supportEmail?<a href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a>:'Contact your administrator'}</p>
        <small>Only administrators with settings permission can change workspace settings.</small>
      </div>}
    </Panel>
    <Panel title="Personal preferences" className="settings-panel">
      <form className="settings-form" onSubmit={(event) => { event.preventDefault(); onSavePreferences(personal); }}>
        <label className="settings-toggle"><input type="checkbox" checked={Boolean(personal.compactMode)} onChange={(event) => setPersonal((current) => ({...current,compactMode:event.target.checked}))}/><span><b>Compact workspace</b><small>Reduce spacing across dashboard cards and tables.</small></span></label>
        <label className="settings-toggle"><input type="checkbox" checked={Boolean(personal.hideWelcome)} onChange={(event) => setPersonal((current) => ({...current,hideWelcome:event.target.checked}))}/><span><b>Hide welcome banner</b><small>Keep the dashboard focused on work items.</small></span></label>
        <p>These preferences are saved to your employee account.</p>
        <button className="button primary" disabled={busy}>{busy?<LoaderCircle className="spin" size={15}/>:<Check size={15}/>}Save personal preferences</button>
      </form>
    </Panel>
  </div>;
}

function SearchableMultiSelect({ options = [], selected = [], onChange, label }) {
  const [search, setSearch] = useState('');
  const matches = options.filter(([, name]) => name.toLowerCase().includes(search.trim().toLowerCase()));
  const selectedOptions = options.filter(([value]) => selected.includes(value));
  const toggle = (value, checked) => {
    if(checked&&selected.length>=100)return;
    onChange(checked ? [...new Set([...selected, value])] : selected.filter((item) => item !== value));
  };

  return <div className="searchable-multi-select">
    <div className="employee-picker-toolbar">
      <label className="employee-picker-search">
        <Search size={15}/>
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by employee name or email" aria-label={`Search ${label.toLowerCase()}`}/>
      </label>
      <div className="employee-picker-actions">
        <span>{selected.length} selected · up to 100</span>
        <button type="button" className="text-button" onClick={() => onChange([...new Set([...selected, ...matches.map(([value]) => value)])])} disabled={!matches.length}>Select shown</button>
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
      {!options.length&&<p className="employee-picker-empty">No active employees available.</p>}
      {options.length>0&&!matches.length&&<p className="employee-picker-empty">No employees match “{search}”.</p>}
    </div>
  </div>;
}

function Modal({ type, lookups, record, onClose, onSubmit, busy }) {
  const isEdit = Boolean(record && record.id);
  const [values,setValues]=useState(type==='review'?{status:record.status,remarks:''}:type==='role'?{
    name:record.name||'',description:record.description||'',permissions:record.permissions||[],
  }:type==='profile'?{
    fullName:record.full_name||'',email:record.email||'',dateOfBirth:record.date_of_birth?.slice(0,10)||'',
    gender:record.gender||'',address:record.address||'',skills:record.skills?.join(', ')||'',experienceYears:record.experience_years||'',
  }:type==='employee'?{
    fullName:record.full_name||'',email:record.email||'',mobile:record.mobile||'',dateOfBirth:record.date_of_birth?.slice(0,10)||'',
    gender:record.gender||'',address:record.address||'',skills:record.skills?.join(', ')||'',experienceYears:record.experience_years||'',
    employeeType:record.employee_type||'Annotator',roleId:record.role_id||'',status:record.status||'active',
    highestQualification:record.highest_qualification||'',city:record.city||'',linkedinUrl:record.linkedin_url||'',
  }:type==='project'?{
    name:record.name||'',code:record.code||'',vendorId:record.vendor_id||'',description:record.description||'',
    instructions:record.instructions||'',requiredSkills:record.required_skills?.join(', ')||'',requiredAnnotators:record.required_annotators||'',
    startDate:record.start_date?.slice(0,10)||'',endDate:record.end_date?.slice(0,10)||'',applicationDeadline:record.application_deadline?.slice(0,10)||'',
    projectType:record.project_type||'',estimatedBudget:record.estimated_budget||'',status:record.status||'Draft',
  }:type==='vendor'?{
    companyName:record.company_name||'',contactPerson:record.contact_person||'',email:record.email||'',mobile:record.mobile||'',
    address:record.address||'',companyDetails:record.company_details||'',status:record.status||'active',
  }:type==='announcement'?{
    title:record.title||'',body:record.body||'',priority:record.priority||'Normal',publishAt:record.publish_at?.slice(0,16)||'',
    expiresAt:record.expires_at?.slice(0,16)||'',isPublished:record.is_published===true,targetAll:record.target_all!==false,
  }:{});
  const set=(key,value)=>setValues((current)=>({...current,[key]:value}));
  const configs={
    employee:{title: isEdit ? 'Edit Employee' : 'Add New Employee',fields:[['fullName','Full Name'],['email','Email','email'],['mobile','Mobile Number','tel'],['dateOfBirth','Date of Birth','date'],['gender','Gender','select',[['Female','Female'],['Male','Male'],['Non-binary','Non-binary'],['Prefer not to say','Prefer not to say']]],['address','Address','textarea'],['skills','Skills (comma separated)'],['experienceYears','Experience (years)','number'],['highestQualification','Highest Qualification'],['city','City'],['linkedinUrl','LinkedIn URL'],['employeeType','Employee Type'],['roleId','Assigned Role','select',lookups.roles?.map((r)=>[r.id,r.name])],['status','Status','select',[['active','Active'],['inactive','Inactive']]],...(isEdit?[]:[['profilePhoto','Profile Photo','file','image/*'],['resume','Resume','file','.pdf,.doc,.docx'],['idProof','ID Proof','file','.pdf,.jpg,.jpeg,.png']])]},
    project:{title: isEdit ? 'Edit Project' : 'Add New Project',fields:[['name','Project Name'],['code','Project Code'],['vendorId','Vendor','select',lookups.vendors?.map((v)=>[v.id,v.company_name])],['description','Description','textarea'],['instructions','Project Instructions','textarea'],['requiredSkills','Required Skills (comma separated)'],['requiredAnnotators','Number of Annotators','number'],['startDate','Start Date','date'],['endDate','End Date','date'],['applicationDeadline','Application Deadline','date'],['projectType','Project Type'],['estimatedBudget','Estimated Budget','number'],['status','Project Status','select',[['Draft','Draft'],['Published','Published'],['In Progress','In Progress'],['Completed','Completed'],['On Hold','On Hold'],['Cancelled','Cancelled']]],...(isEdit?[]:[['attachment','Project Attachment','file','.pdf,.doc,.docx,.png,.jpg,.jpeg']])]},
    vendor:{title: isEdit ? 'Edit Vendor' : 'Add New Vendor',fields:[['companyName','Company Name'],['contactPerson','Contact Person'],['email','Email','email'],['mobile','Mobile Number','tel'],['address','Address','textarea'],['companyDetails','Company Details','textarea'],...(isEdit?[['status','Status','select',[['active','Active'],['inactive','Inactive']]]]:[])]},
    announcement:{
      title: isEdit ? 'Edit Announcement' : 'Create Announcement',
      fields: [
        ['title','Title'],
        ['body','Announcement Message','textarea'],
        ['priority','Priority','select',[['Low','Low'],['Normal','Normal'],['High','High'],['Urgent','Urgent']]],
        ['publishAt','Publish Date','date'],
        ['expiresAt','Expiry Date','date'],
        ...(!isEdit
          ? [
              ['targetAll','Audience','select',[['true','All Employees'],['false','Selected Employees']]],
              ...(values.targetAll==='false'
                ? [['employeeIds','Select Employees','multiselect',lookups.employees?.map((employee)=>[employee.id,`${employee.full_name} - ${employee.email}`])]]
                : []),
            ]
          : []),
      ],
    },
    invite:{title:'Send Project Invitations',fields:[['projectId','Project','select',lookups.projects?.map((p)=>[p.id,p.name])],['employeeIds','Select Employees','multiselect',lookups.employees?.map((employee)=>[employee.id,`${employee.full_name} - ${employee.email}`])],['subject','Email Subject'],['message','Invitation Message','textarea']]},
    review:{title:`${record.status} Application`,fields:[['remarks','Admin Remarks','textarea']]},
    role:{title: isEdit ? 'Edit Role' : 'Create Role',fields:[['name','Role Name'],['description','Description','textarea']]},
    profile:{title:'Update Profile',fields:[['fullName','Full Name'],['email','Email','email'],['dateOfBirth','Date of Birth','date'],['gender','Gender','select',[['Female','Female'],['Male','Male'],['Non-binary','Non-binary'],['Prefer not to say','Prefer not to say']]],['address','Address','textarea'],['skills','Skills (comma separated)'],['experienceYears','Experience (years)','number']]},
  };
  const config=configs[type];
  const handleSubmit=(event)=>{event.preventDefault();onSubmit(values);};
  return <div className="modal-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)onClose();}}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <header><div><span className="modal-icon"><Plus size={17}/></span><h2 id="modal-title">{config.title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={17}/></button></header>
    <form onSubmit={handleSubmit}><div className="modal-fields">{config.fields.map(([key,label,kind,options])=>kind==='multiselect'
      ?<div key={key} className="modal-field span-two"><span className="modal-field-label">{label}</span><SearchableMultiSelect options={options||[]} selected={values[key]||[]} onChange={(selected)=>set(key,selected)} label={label}/></div>
      :<label key={key} className={kind==='textarea'?'span-two':''}>{label}
        {kind==='textarea'?<textarea rows="3" placeholder={`Enter ${label.toLowerCase()}`} value={values[key]||''} onChange={(e)=>set(key,e.target.value)} required={['fullName','title','body','message'].includes(key)}/>:kind==='select'?<select value={values[key]||''} onChange={(e)=>set(key,e.target.value)} required><option value="">Select {label.toLowerCase()}</option>{options?.map(([value,name])=><option key={value} value={value}>{name}</option>)}</select>:kind==='file'?<input type="file" accept={options} onChange={(e)=>set(key,e.target.files?.[0]||null)}/>:<input type={['date','email','tel','number'].includes(kind)?kind:'text'} placeholder={kind==='date'?undefined:`Enter ${label.toLowerCase()}`} value={values[key]||''} onChange={(e)=>set(key,e.target.value)} required={['fullName','email','mobile','name','code','vendorId','companyName','contactPerson','projectId','subject','roleId'].includes(key)}/>}
      </label>)}</div><div className="modal-footer"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy?<LoaderCircle className="spin" size={15}/>:<Check size={15}/>}Save</button></div></form>
  </section></div>;
}

export default function App() {
  const publicFormSlug = publicFormSlugFromPath(window.location.pathname);
  const [user,setUser]=useState(null);
  const [showLogin,setShowLogin]=useState(()=>window.location.pathname!=='/'&&Boolean(pageFromPath(window.location.pathname)));
  const [csrf,setCsrf]=useState(null);
  const [initializing,setInitializing]=useState(true);
  const [page,setPage]=useState(()=>pageFromPath(window.location.pathname)||'Dashboard');
  const [data,setData]=useState(null);
  const [items,setItems]=useState([]);
  const [lookups,setLookups]=useState({roles:[],vendors:[],projects:[],permissions:[],employeeTypes:[]});
  const [employeeFilters,setEmployeeFilters]=useState(initialEmployeeFilters);
  const [employeePagination,setEmployeePagination]=useState({page:1,pageSize:25,total:0,totalPages:0});
  const [listFilters,setListFilters]=useState(initialListFilters);
  const [listPagination,setListPagination]=useState({page:1,pageSize:25,total:0,totalPages:0});
  const [settings,setSettings]=useState({workspaceName:'Annotra AI',supportEmail:''});
  const [preferences,setPreferences]=useState({compactMode:false,hideWelcome:false});
  const [query,setQuery]=useState('');
  const [error,setError]=useState('');
  const [toast,setToast]=useState('');
  const [modal,setModal]=useState(null);
  const [busy,setBusy]=useState(false);
  const [applyingProjectId,setApplyingProjectId]=useState(null);
  const [dismissed,setDismissed]=useState(false);
  const [collapsed,setCollapsed]=useState(false);
  const employee=user?.role==='Annotator';

  useEffect(()=>{
    if(publicFormSlug){setInitializing(false);return;}
    api('/auth/session').then((result)=>{setUser(result.user);setCsrf(result.csrfToken);setCsrfToken(result.csrfToken);}).catch((e)=>setError(e.message)).finally(()=>setInitializing(false));
  },[publicFormSlug]);
  useEffect(()=>{
    if(publicFormSlug)return;
    const landing=window.location.pathname==='/'&&!showLogin&&!user;
    const title=landing?'Annotra AI | Data Annotation Services':showLogin?'Team Login | Annotra AI':page==='Dashboard'?'Dashboard | Annotra AI':`${page} | Annotra AI`;
    const description=landing
      ?'Annotra AI delivers reliable data annotation services with skilled teams, clear workflows, and quality-focused operations.'
      :showLogin
        ?'Sign in securely to access the Annotra AI team workspace.'
      :page==='Forms'
        ?'Create shareable forms and review submitted responses in the Annotra AI workspace.'
        :'Secure Annotra AI team workspace for managing annotation projects, employees, and operations.';
    updatePageMetadata({title,description,robots:landing?'index,follow':'noindex,nofollow'});
  },[page,showLogin,user,publicFormSlug]);
  useEffect(()=>{
    if(!user)return undefined;
    let active=true;
    Promise.all([api('/settings'),api('/preferences')])
      .then(([systemResult,preferenceResult])=>{
        if(!active)return;
        setSettings(systemResult.data);
        setPreferences(preferenceResult.data);
      })
      .catch((e)=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[user]);
  const notify=useCallback((message)=>{setToast(message);window.setTimeout(()=>setToast(''),3500);},[]);
  const navigate=useCallback((next,{replace=false}={})=>{
    const path=next==='Dashboard'?'/':`/${routeSlug(next)}`;
    const currentPage=pageFromPath(window.location.pathname);
    const wasEmployees=currentPage==='Employees';
    const search=next==='Employees'&&wasEmployees?window.location.search:'';
    const target=`${path}${search}`;
    if(`${window.location.pathname}${window.location.search}`!==target||window.location.hash) {
      window.history[replace?'replaceState':'pushState'](null,'',target);
    }
    if(next==='Employees'&&!wasEmployees){
      const defaults={search:'',roleId:'',employeeType:'',status:'',joiningFrom:'',joiningTo:'',sortBy:'joiningDate',sortDirection:'desc',page:1,pageSize:25};
      setEmployeeFilters(defaults);
    }
    if(['Projects','Vendors','Applications'].includes(next)&&currentPage!==next)setListFilters(initialListFilters());
    setPage(next);setQuery('');setError('');setCollapsed(false);
  },[]);
  const refresh=useCallback(async()=>{
    if(!user)return;
    setError('');
    try {
      if(page==='Dashboard')setData(await api('/dashboard'));
      else if(page==='My Projects')setItems((await api('/projects?assigned=true')).data);
      else if(page==='Available Projects')setItems((await api('/projects?available=true')).data);
      else if(page==='My Applications'){
        setItems((await api('/my-applications')).data);
      } else if(page==='My Profile'){
        const result=await api(`/employees/${user.id}`);
        setItems([result.data]);
      } else if(page==='Settings'){
        const [systemResult,preferenceResult]=await Promise.all([api('/settings'),api('/preferences')]);
        setSettings(systemResult.data);
        setPreferences(preferenceResult.data);
      } else if(page==='Messages'||page==='Support'||page==='Reports'||page==='Forms'){
        if(page==='Reports')setItems([await api('/reports/summary').then((r)=>r.data)]);
        else setItems([]);
      } else if(page==='Email Invitations'){
        const [result,lookup]=await Promise.all([api('/invitations'),api('/lookups')]);
        setItems(result.data);
        setLookups((previous)=>({...previous,...lookup}));
      } else if(page==='Employees'){
        const params=new URLSearchParams();
        for(const [key,value] of Object.entries(employeeFilters))if(value!==''&&value!==null&&value!==undefined)params.set(key,String(value));
        const result=await api(`/employees?${params}`);
        setItems(result.data);
        setEmployeePagination(result.pagination);
      } else if(['Projects','Vendors','Applications'].includes(page)){
        const params=new URLSearchParams();
        for(const [key,value] of Object.entries(listFilters))if(value!==''&&value!==null&&value!==undefined)params.set(key,String(value));
        const result=await api(`${endpoints[page]}?${params}`);
        setItems(result.data);
        setListPagination(result.pagination);
      } else if(endpoints[page]){
        setItems((await api(endpoints[page])).data);
      }
      if(['Employees','Projects','Vendors','Announcements','Roles & Permissions'].includes(page)||page==='Dashboard'){
        const result=await api('/lookups');
        setLookups((previous)=>({...previous,...result}));
      }
    } catch(e){setError(e.message);}
  },[user,page,employeeFilters,listFilters]);
  const applyEmployeeFilters=useCallback((nextFilters)=>{
    const next={...nextFilters,pageSize:Number(nextFilters.pageSize)||25,page:Number(nextFilters.page)||1};
    setEmployeeFilters(next);
    const params=new URLSearchParams();
    for(const [key,value] of Object.entries(next))if(value!==''&&value!==null&&value!==undefined)params.set(key,String(value));
    const target=`/employees${params.size?`?${params}`:''}`;
    window.history.pushState(null,'',target);
  },[]);
  const applyListFilters=useCallback((nextFilters)=>{
    const next={...nextFilters,pageSize:Number(nextFilters.pageSize)||25,page:Number(nextFilters.page)||1};
    setListFilters(next);
    const params=new URLSearchParams();
    for(const [key,value] of Object.entries(next))if(value!==''&&value!==null&&value!==undefined)params.set(key,String(value));
    window.history.pushState(null,'',`/${routeSlug(page)}${params.size?`?${params}`:''}`);
  },[page]);
  useEffect(()=>{refresh();},[refresh]);
  useEffect(()=>{
    const onHistoryChange=()=>{
      const next=pageFromPath(window.location.pathname);
      setPage(next||'Dashboard');
      if(next){
        setShowLogin(false);
        if(next==='Employees')setEmployeeFilters(initialEmployeeFilters());
        if(['Projects','Vendors','Applications'].includes(next))setListFilters(initialListFilters());
      }
      else if(user)setError('That page does not exist.');
    };
    window.addEventListener('popstate',onHistoryChange);
    return()=>window.removeEventListener('popstate',onHistoryChange);
  },[user]);
  useEffect(()=>{
    if(!user||initializing)return;
    const roleNav=user.role==='Annotator'?employeeNav:user.role==='Reviewer'?reviewerNav:user.role==='Team Lead'?teamLeadNav:adminNav;
    const visiblePages=roleNav.filter(([label])=>!navPermission[label]||userHasPermission(user,navPermission[label])).map(([label])=>label);
    if(!visiblePages.includes(page)&&page!=='Notifications'){
      navigate('Dashboard',{replace:true});
      setError('You do not have permission to access that page.');
    }
  },[user,page,initializing,navigate]);
  useEffect(()=>{if(!user)return;const listener=(event)=>{if(event.key==='Escape')setModal(null);};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener);},[user]);

  async function submitModal(values) {
    setBusy(true);setError('');
    try {
      const body={...values};
      const uploadSpecs=modal.type==='employee'?[['profile-photo','profilePhoto'],['resume','resume'],['id-proof','idProof']]:modal.type==='project'?[['project','attachment']]:[];
      const files=uploadSpecs.filter(([,key])=>body[key]).map(([kind,key])=>({kind,file:body[key]}));
      for(const [,key] of uploadSpecs)delete body[key];
      if(body.skills)body.skills=body.skills.split(',').map((item)=>item.trim()).filter(Boolean);
      if(body.requiredSkills)body.requiredSkills=body.requiredSkills.split(',').map((item)=>item.trim()).filter(Boolean);
      if(body.permissions&&!Array.isArray(body.permissions))body.permissions=body.permissions.split(',').map((item)=>item.trim()).filter(Boolean);
      if(body.targetAll!==undefined)body.targetAll=body.targetAll==='true';
      if(modal.type==='review') {
        await api(`/applications/${modal.record.id}`,{method:'PATCH',body:JSON.stringify({status:modal.status,remarks:body.remarks})});
      } else if(modal.type==='invite') {
        body.employeeIds=Array.isArray(body.employeeIds)?body.employeeIds:body.employeeIds.split(',').map((item)=>item.trim()).filter(Boolean);
        await api('/invitations',{method:'POST',body:JSON.stringify(body)});
      } else if(modal.type==='profile') {
        const result=await api(`/employees/${user.id}`,{method:'PATCH',body:JSON.stringify(body)});
        setUser((previous)=>({...previous,name:result.data.full_name}));
      } else if(modal.type==='role') {
        await api(modal.record?.id?`/roles/${modal.record.id}`:'/roles',{method:modal.record?.id?'PUT':'POST',body:JSON.stringify(body)});
      } else if(modal.type==='employee') {
        if (modal.record?.id) {
          await api(`/employees/${modal.record.id}`,{method:'PATCH',body:JSON.stringify(body)});
        } else {
          const path='/employees';
          const created=await api(path,{method:'POST',body:JSON.stringify(body)});
          for(const {kind,file} of files) {
            const form=new FormData();
            form.append('file',file);
            form.append('employeeId',created.data.id);
            try{const uploadResult=await api(`/upload/${kind}`,{method:'POST',body:form});if(uploadResult.warning)setError(uploadResult.warning);}
            catch(uploadError){setModal(null);await refresh();setError(`The record was created, but its ${kind} upload failed: ${uploadError.message}`);return;}
          }
        }
      } else if(modal.type==='project') {
        if (modal.record?.id) {
          await api(`/projects/${modal.record.id}`,{method:'PATCH',body:JSON.stringify(body)});
        } else {
          const path='/projects';
          const created=await api(path,{method:'POST',body:JSON.stringify(body)});
          for(const {kind,file} of files) {
            const form=new FormData();
            form.append('file',file);
            form.append('projectId',created.data.id);
            try{const uploadResult=await api(`/upload/${kind}`,{method:'POST',body:form});if(uploadResult.warning)setError(uploadResult.warning);}
            catch(uploadError){setModal(null);await refresh();setError(`The record was created, but its ${kind} upload failed: ${uploadError.message}`);return;}
          }
        }
      } else if(modal.type==='vendor') {
        if (modal.record?.id) {
          await api(`/vendors/${modal.record.id}`,{method:'PATCH',body:JSON.stringify(body)});
        } else {
          await api('/vendors',{method:'POST',body:JSON.stringify(body)});
        }
      } else if(modal.type==='announcement') {
        if (modal.record?.id) {
          await api(`/announcements/${modal.record.id}`,{method:'PATCH',body:JSON.stringify(body)});
        } else {
          await api('/announcements',{method:'POST',body:JSON.stringify(body)});
        }
      } else {
        const path={employee:'/employees',project:'/projects',vendor:'/vendors',announcement:'/announcements',role:'/roles'}[modal.type];
        await api(path,{method:'POST',body:JSON.stringify(body)});
      }
      setModal(null);notify('Your changes have been saved.');await refresh();
    } catch(e){setError(e.message);}
    finally{setBusy(false);}
  }
  async function saveRolePermissions(role,permissionCodes) {
    setBusy(true);setError('');
    try {
      await api(`/roles/${role.id}`,{method:'PUT',body:JSON.stringify({name:role.name,description:role.description,permissions:permissionCodes})});
      notify('Role permissions saved.');
      await refresh();
      return true;
    } catch(e) { setError(e.message);return false; }
    finally { setBusy(false); }
  }
  async function reviewApplication(record,status) {setModal({type:'review',record,status});}
  async function saveSettings(values) {
    setBusy(true);setError('');
    try {
      const result=await api('/settings',{method:'PATCH',body:JSON.stringify(values)});
      setSettings(result.data);
      notify('Workspace settings saved.');
    } catch(e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function savePreferences(values) {
    setBusy(true);setError('');
    try {
      const result=await api('/preferences',{method:'PATCH',body:JSON.stringify(values)});
      setPreferences(result.data);
      setDismissed(result.data.hideWelcome);
      notify('Personal preferences saved.');
    } catch(e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function reviewEmployee(record,status) {
    try {
      await api(`/employees/${record.id}/approval`,{method:'PATCH',body:JSON.stringify({status})});
      notify(`Employee registration ${status==='active'?'approved':'rejected'}.`);
      await refresh();
    } catch(e) { setError(e.message); }
  }
  async function deleteRole(record) {
    if(!window.confirm(`Delete the ${record.name} role?`))return;
    try{await api(`/roles/${record.id}`,{method:'DELETE'});notify('Role deleted.');await refresh();}
    catch(e){setError(e.message);}
  }
  async function assignEmployeeRole(record,roleId) {
    try {
      await api(`/employees/${record.id}/role`,{method:'PATCH',body:JSON.stringify({roleId})});
      notify('Employee role updated.');
      await refresh();
    } catch(e) { setError(e.message); await refresh(); }
  }
  async function toggleEmployee(record) {
    if(page==='Notifications') {
      try{await api(`/notifications/${record.id}/read`,{method:'PATCH',body:JSON.stringify({})});notify('Notification marked as read.');await refresh();}
      catch(e){setError(e.message);}
      return;
    }
    if(page==='Announcements') {
      try{await api(`/announcements/${record.id}/publish`,{method:'PATCH',body:JSON.stringify({isPublished:!record.is_published})});notify('Announcement visibility updated.');await refresh();}
      catch(e){setError(e.message);}
      return;
    }
    try{await api(`/employees/${record.id}/status`,{method:'PATCH',body:JSON.stringify({status:record.status==='active'?'inactive':'active'})});notify('Employee status updated.');await refresh();}
    catch(e){setError(e.message);}
  }
  async function apply(projectId) {
    setApplyingProjectId(projectId);
    setError('');
    try{await api(`/projects/${projectId}/apply`,{method:'POST',body:JSON.stringify({})});notify('Your application has been submitted.');await refresh();}
    catch(e){setError(e.message);}
    finally{setApplyingProjectId(null);}
  }
  async function logout() {
    try{await api('/auth/logout',{method:'POST'});}catch(e){setError(e.message);return;}
    setUser(null);setData(null);setItems([]);setCsrf(null);setCsrfToken(null);navigate('Dashboard',{replace:true});
  }
  function pageAction() {
    if(page==='Employees')return()=>setModal({type:'employee'});
    if(page==='Projects')return()=>setModal({type:'project'});
    if(page==='Vendors')return()=>setModal({type:'vendor'});
    if(page==='Announcements')return()=>setModal({type:'announcement'});
    if(page==='Email Invitations')return()=>setModal({type:'invite'});
    return null;
  }
  if(publicFormSlug)return <PublicFormPage slug={publicFormSlug}/>;
  if(initializing)return <div className="loading-screen"><LoaderCircle className="spin" size={28}/><span>Loading your workspace…</span></div>;
  if(!pageFromPath(window.location.pathname))return <div className="not-found-page"><h1>Page not found</h1><p>The page you requested does not exist.</p><button className="button primary" onClick={()=>navigate('Dashboard')}>Go to home</button></div>;
  if(!user)return window.location.pathname!=='/'||showLogin
    ? <AuthScreen onBack={()=>setShowLogin(false)} onLogin={(next,token)=>{setUser(next);setCsrf(token);navigate('Dashboard',{replace:true});}}/>
    : <LandingPage onLogin={()=>setShowLogin(true)}/>;
  const actionPermission={Employees:'employees.create',Projects:'projects.create',Vendors:'vendors.create',Announcements:'announcements.create','Email Invitations':'invitations.send','Roles & Permissions':'roles.manage'};
  const createAllowed=Boolean(actionPermission[page]&&userHasPermission(user,actionPermission[page]));
  return <div className={`app-shell${preferences.compactMode?' compact-mode':''}`}>
    <Sidebar user={user} active={page} onNavigate={(target)=>{navigate(target);setCollapsed(false);}} collapsed={collapsed} setCollapsed={setCollapsed} onLogout={logout} workspaceName={settings.workspaceName} supportEmail={settings.supportEmail}/>
    <div className="main-column"><Header user={user} query={query} setQuery={setQuery} onMenu={()=>setCollapsed(!collapsed)} onLogout={logout} onNotifications={()=>navigate('Notifications')} unreadCount={data?.activity?.filter((item)=>!item.read_at).length||0}/>
      <main className="page-content">
        {page==='Dashboard'?<>{!dismissed&&!preferences.hideWelcome&&<Welcome user={user} employee={employee} dismiss={false} onDismiss={()=>setDismissed(true)} workspaceName={settings.workspaceName}/>}{error&&<div className="error-banner">{error}<button onClick={()=>setError('')}><X size={14}/></button></div>}{data?(data.role==='team'?<TeamDashboard data={data} user={user} onNavigate={navigate}/>:employee?<EmployeeDashboard data={data} onNavigate={navigate} onApply={apply}/>:<AdminDashboard data={data} permissions={user.permissions} onNavigate={navigate}/>):<div className="dashboard-loading"><LoaderCircle className="spin"/>Loading your dashboard…</div>}</>:<><div className="page-title-row"><div><span className="eyebrow">{employee?'ANNOTATOR WORKSPACE':'ANNOTRA TEAM WORKSPACE'}</span><h1>{page}</h1><p>{page==='Forms'?'Build shareable forms, collect responses, and export your data.':page==='Roles & Permissions'?'Create role profiles and choose which permissions each role receives.':page==='Employees'?'Review registrations, manage account status, and assign authorized roles.':employee?`Welcome back, ${user.name.split(' ')[0]}. Here's your ${page.toLowerCase()} view.`:`Manage ${page.toLowerCase()} for your annotation team.`}</p></div>{createAllowed&&pageAction()&&<button className="button primary" onClick={pageAction()}><Plus size={16}/>{page==='Email Invitations'?'Send Invitations':page==='Roles & Permissions'?'Create Role':`Add ${page==='Employees'?'Employee':page==='Projects'?'Project':page==='Vendors'?'Vendor':'Announcement'}`}</button>}</div>{error&&<div className="error-banner">{error}<button onClick={()=>setError('')}><X size={14}/></button></div>}
          {page==='Settings'?<SettingsPage settings={settings} preferences={preferences} canManageSettings={user.permissions?.includes('settings.manage')||user.role==='Super Admin'} onSaveSettings={saveSettings} onSavePreferences={savePreferences} busy={busy}/>
          :page==='Forms'?<FormsPage/>
          :page==='Messages'||page==='Support'?<Panel title={page}><div className="empty-state"><span><CircleHelp size={24}/></span><b>{page==='Messages'?'No messages yet':'How can we help?'}</b><p>{page==='Support'?(settings.supportEmail?<>Contact your administrator at <a href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a>.</>:'Contact your team administrator for account or project support.'):'Updates about applications and projects will appear here.'}</p></div></Panel>
          :page==='Reports'?<Panel title="Reports overview"><div className="stats-grid report-stats">{items[0]&&Object.entries(items[0]).map(([key,value])=><StatCard key={key} title={key.replaceAll('_',' ')} value={value} tone="blue" icon={BarChart3}/>)}</div></Panel>
          :page==='My Profile'?<Panel title="My Profile" action={{label:'Edit Profile',onClick:()=>setModal({type:'profile',record:items[0]||{}})}}><div className="profile-card">{items[0]?.profile_photo_url?<img className="avatar profile-avatar" src={items[0].profile_photo_url} alt="Profile"/>:<span className="avatar profile-avatar">{user.name?.split(' ').map((part)=>part[0]).slice(0,2).join('')}</span>}<div><h2>{user.name}</h2><p>{user.role} · {user.mobile}</p><StatusBadge value={items[0]?.status||'Active'}/><small className="profile-email">{items[0]?.email}</small></div></div><div className="profile-documents">{[['profile-photo','Profile Photo','image/*',items[0]?.profile_photo_url],['resume','Resume','application/pdf,.doc,.docx',items[0]?.resume_url],['id-proof','ID Proof','application/pdf,.jpg,.jpeg,.png',items[0]?.id_proof_url]].map(([kind,label,accept,url])=>{const document=items[0]?.documents?.find((item)=>item.document_type===kind);return <label key={kind}><span><b>{label}</b><small>{url?<a href={url} target="_blank" rel="noreferrer">View current file</a>:'Not uploaded'}</small></span><div className="profile-file-actions"><input type="file" accept={accept} onChange={(event)=>uploadOwnDocument(kind,event.target.files?.[0])}/>{document&&<button type="button" className="mini-action reject" onClick={()=>deleteOwnDocument(document.id)}>Delete</button>}</div></label>})}</div></Panel>
          :page==='Roles & Permissions'?<RolePermissionsPage roles={items} permissions={lookups.permissions||[]} currentUser={user} onCreate={()=>setModal({type:'role'})} onSave={saveRolePermissions} busy={busy}/>
          :<>{['My Projects','Available Projects','My Applications'].includes(page)?<Panel title={page}><div className="available-list standalone">{items.filter((item)=>JSON.stringify(item).toLowerCase().includes(query.toLowerCase())).map((project)=><article className="available-item" key={project.id}><div className="project-symbol"><FolderClosed size={18}/></div><div className="project-details"><b>{project.name||project.project}</b><span>{project.vendor||`Applied ${fmtDate(project.applied_at)}`}</span><div className="skill-tags">{(project.required_skills||[]).map((tag)=><i key={tag}>{tag}</i>)}</div></div>{page==='Available Projects'?<button className={`button small ${project.applied?'applied-button':'primary'}`} disabled={project.applied||applyingProjectId===project.id} onClick={()=>apply(project.id)}>{project.applied?'Applied':applyingProjectId===project.id?'Applying…':'Apply'}</button>:project.status?<StatusBadge value={project.status}/>:null}</article>)}{!items.length&&<div className="empty-state"><span><IconForPage page={page}/></span><b>Nothing here yet</b><p>No real project records are available for this view yet.</p></div>}</div></Panel>:<DataPage page={page} items={items} query={query} filters={page==='Employees'?employeeFilters:listFilters} pagination={page==='Employees'?employeePagination:['Projects','Vendors','Applications'].includes(page)?listPagination:null} onApplyEmployeeFilters={applyEmployeeFilters} onApplyFilters={applyListFilters} employeeTypes={lookups.employeeTypes||[]} canCreate={createAllowed} canApproveEmployees={user.permissions?.includes('employees.approve')} canAssignRoles={user.permissions?.includes('employees.assign_role')} canEditEmployees={user.permissions?.includes('employees.edit')||user.role==='Super Admin'} user={user} roles={lookups.roles||[]} vendors={lookups.vendors||[]} onCreate={pageAction()} onReview={reviewApplication} onReviewEmployee={reviewEmployee} onAssignRole={assignEmployeeRole} onToggle={toggleEmployee} onEdit={(record)=>{if(page==='Roles & Permissions')setModal({type:'role',record});else if(page==='Employees')setModal({type:'employee',record});else if(page==='Projects')setModal({type:'project',record});else if(page==='Vendors')setModal({type:'vendor',record});else if(page==='Announcements')setModal({type:'announcement',record});}} onDelete={deleteRole}/>}</>}
        </>}
      </main>
    </div>
    {collapsed&&<button className="mobile-scrim" onClick={()=>setCollapsed(false)} aria-label="Close sidebar"/>}
    {toast&&<div className="toast"><CircleCheckBig size={16}/>{toast}</div>}
    {modal&&<Modal type={modal.type} lookups={lookups} record={modal.record||{}} onClose={()=>setModal(null)} onSubmit={submitModal} busy={busy}/>}
  </div>;
}

function IconForPage({page}){const Icon=pageIcons[page]||FileText;return <Icon size={24}/>;}
