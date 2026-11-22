import React, { useEffect, useState } from 'react';
import { Check, ChevronRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Send, Shield } from 'lucide-react';
import { api, setCsrfToken } from '../../api.js';
import './index.css';

export default function AuthScreen({ onLogin, onBack }) {
  const [mobile, setMobile] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
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
    return { fullName, mobile, password };
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
    setBusy(true);
    try {
      const result = await api('/auth/register/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ mobile, code }),
      });
      setView('login');
      setSignupSent(false);
      setLoginMethod('otp');
      setPassword(''); setCode('');
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
  return <div className={`landing-page auth-page ${view === 'signup' ? 'auth-page-signup' : ''}`}>
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
          <p>{view==='signup'?(signupSent?'Enter the OTP sent to your mobile to finish registration.':'Use your name, mobile number, and password. We’ll verify your mobile with an OTP.'):sent?'Enter the one-time code sent to your mobile.':'Sign in to your Annotra AI workspace.'}</p>
        </div>
        {view==='signup' ? signupSent ? <form onSubmit={finishSignup} className="auth-form">
          <label htmlFor="signup-otp">6-digit verification code</label>
          <input id="signup-otp" className="otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" value={code} onChange={(event)=>setCode(event.target.value.replace(/\D/g,''))} required/>
          <small className="otp-expiry">{otpSeconds>0?`Code expires in ${Math.floor(otpSeconds/60)}:${String(otpSeconds%60).padStart(2,'0')}`:'This code has expired. Request a new one.'}</small>
          <button className="button primary wide" disabled={busy||otpSeconds===0}>{busy?<LoaderCircle className="spin" size={16}/>:<Check size={16}/>}Verify OTP & Create Account</button>
          <button type="button" className="text-button" disabled={busy||resendSeconds>0} onClick={resendSignup}>{resendSeconds>0?`Resend OTP in ${resendSeconds}s`:'Resend OTP'}</button>
          {devBypass&&<p className="dev-hint">Local development code: <b>000000</b></p>}
          <button type="button" className="text-button" onClick={()=>{setSignupSent(false);setCode('');setError('');}}>Back to registration details</button>
        </form> : <form onSubmit={beginSignup} className="auth-form signup-form">
          <label htmlFor="signup-name">Full Name</label>
          <input id="signup-name" autoComplete="name" placeholder="Enter your full name" value={fullName} maxLength={120} onChange={(event)=>setFullName(event.target.value)} required/>
          <label htmlFor="signup-mobile">Mobile Number</label>
          <div className="mobile-field"><span>+91</span><input id="signup-mobile" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit number" value={mobile} maxLength={10} onChange={(event)=>setMobile(event.target.value.replace(/\D/g,''))} required/></div>
          <label htmlFor="signup-password">Create Password</label>
          <div className="password-field"><input id="signup-password" type={showPassword?'text':'password'} autoComplete="new-password" placeholder="Create a secure password" minLength={12} maxLength={128} value={password} onChange={(event)=>setPassword(event.target.value)} required/><button type="button" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword((shown)=>!shown)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
          <small className="auth-password-hint">12+ characters, including uppercase, lowercase, and a number.</small>
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
              <button type="button" className="text-button" style={{padding:0,fontSize:'10px'}} onClick={()=>{setLoginMethod('otp');setSent(false);setError('');setMessage('');}}>Sign in with OTP</button>
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

