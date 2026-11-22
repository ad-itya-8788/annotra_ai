import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CircleCheckBig, LoaderCircle, Plus, X } from 'lucide-react';
import { api, setCsrfToken } from './api.js';
import { updatePageMetadata } from './seo.js';
import {
  adminNav, employeeNav, endpoints, initialEmployeeFilters, initialListFilters, navPermission,
  pageFromPath, reviewerNav, teamLeadNav,
  publicFormSlugFromPath, routeSlug, userHasPermission,
} from './appConfig.js';
import Sidebar from './components/Sidebar/index.jsx';
import Header from './components/Header/index.jsx';
import Modal from './components/Modal/index.jsx';
import { ListLoading, LoadingScreen, NotFoundPage } from './components/Feedback/index.jsx';
import { AdminDashboard, EmployeeDashboard, TeamDashboard, Welcome } from './pages/Dashboard/index.jsx';
import DataPage from './pages/ResourcePages/index.jsx';
import RolePermissionsPage from './pages/RolesPermissions/index.jsx';
import SettingsPage from './pages/Settings/index.jsx';
import ProfilePage from './pages/Profile/index.jsx';
import ReportsPage from './pages/Reports/index.jsx';
import MessagesPage from './pages/Messages/index.jsx';
import ProjectListsPage from './pages/ProjectLists/index.jsx';
import LandingPage from './pages/LandingPage/index.jsx';
import AuthScreen from './pages/Auth/index.jsx';
import { FormsPage, PublicFormPage } from './pages/Forms/index.jsx';
import EmailStudioPage, { readLocalTemplates } from './pages/EmailStudio/index.jsx';

export default function App() {
  const publicFormSlug = publicFormSlugFromPath(window.location.pathname);
  const [user,setUser]=useState(null);
  const [showLogin,setShowLogin]=useState(()=>window.location.pathname!=='/'&&window.location.pathname.replace(/\/+$/, '').toLowerCase()!=='/logout'&&Boolean(pageFromPath(window.location.pathname)));
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
  const [settings,setSettings]=useState({workspaceName:'Annotra AI',supportEmail:'annotrai.help@gmail.com'});
  const [emailConfig,setEmailConfig]=useState({configured:null,missing:[],from:''});
  const [emailTemplates,setEmailTemplates]=useState([]);
  const [templatesSupported,setTemplatesSupported]=useState(true);
  const [preferences,setPreferences]=useState({compactMode:false,hideWelcome:false});
  const [query,setQuery]=useState('');
  const [error,setError]=useState('');
  const [toast,setToast]=useState('');
  const [modal,setModal]=useState(null);
  const [busy,setBusy]=useState(false);
  const [applyingProjectId,setApplyingProjectId]=useState(null);
  const [dismissed,setDismissed]=useState(false);
  const [collapsed,setCollapsed]=useState(false);
  const [listLoading,setListLoading]=useState(false);
  const toastTimer=useRef(null);
  const refreshId=useRef(0);
  const employee=user?.role==='Annotator';

  useEffect(()=>{
    if(window.location.pathname.replace(/\/+$/, '').toLowerCase()==='/logout'){
      window.history.replaceState(null,'','/');
      setShowLogin(false);
      setPage('Dashboard');
    }
  },[]);
  useEffect(()=>{
    if(publicFormSlug){setInitializing(false);return;}
    api('/auth/session').then((result)=>{setUser(result.user);setCsrf(result.csrfToken);setCsrfToken(result.csrfToken);}).catch((e)=>setError(e.message)).finally(()=>setInitializing(false));
  },[publicFormSlug]);
  useEffect(()=>{
    const onSessionExpired=()=>{
      setUser(null);setData(null);setItems([]);setCsrf(null);setCsrfToken(null);setModal(null);setShowLogin(true);
      setError('Your session expired. Please sign in again.');
    };
    window.addEventListener('projectflow:session-expired',onSessionExpired);
    return()=>window.removeEventListener('projectflow:session-expired',onSessionExpired);
  },[]);
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
        setSettings({...systemResult.data,supportEmail:systemResult.data.supportEmail||'annotrai.help@gmail.com'});
        setPreferences(preferenceResult.data);
      })
      .catch((e)=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[user]);
  const notify=useCallback((message)=>{
    setToast(message);
    if(toastTimer.current)window.clearTimeout(toastTimer.current);
    toastTimer.current=window.setTimeout(()=>setToast(''),3500);
  },[]);
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
    const requestId=++refreshId.current;
    setError('');setListLoading(true);
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
      } else if(['Create Email','Send Email'].includes(page)){
        const [result,lookup,configResult,templateResult]=await Promise.all([
          api('/invitations'),
          api('/lookups'),
          api('/invitations/config').catch(()=>({data:{configured:false,missing:['a redeployed backend'],from:''}})),
          api('/email-templates').then((result)=>({data:result.data||[],supported:true})).catch(()=>({
            data:readLocalTemplates(),
            supported:false,
          })),
        ]);
        setItems(result.data);
        setLookups((previous)=>({...previous,...lookup}));
        setEmailConfig(configResult.data);
        setEmailTemplates(templateResult.data||[]);
        setTemplatesSupported(templateResult.supported);
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
    } catch(e){if(requestId===refreshId.current&&!e.stale)setError(e.message);}
    finally{if(requestId===refreshId.current)setListLoading(false);}
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
  useEffect(()=>{if(!user)return;const listener=(event)=>{if(event.key==='Escape')closeModal();};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener);},[user]);

  async function submitModal(values) {
    setBusy(true);setError('');
    let completionMessage='Your changes have been saved.';
    let invitationFailures=false;
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
      } else if(modal.type==='resetPassword') {
        if(body.password!==body.confirmPassword)throw new Error('Passwords do not match.');
        await api(`/employees/${modal.record.id}/password`,{method:'PATCH',body:JSON.stringify({password:body.password,confirmPassword:body.confirmPassword})});
        completionMessage='Password updated. Other active sessions for this employee have been signed out.';
      } else if(modal.type==='invite') {
        body.employeeIds=Array.isArray(body.employeeIds)?body.employeeIds:body.employeeIds.split(',').map((item)=>item.trim()).filter(Boolean);
        const result=await api('/invitations',{method:'POST',body:JSON.stringify(body)});
        if(!Array.isArray(result.data))throw new Error('The invitation service returned an invalid response.');
        const sent=result.data.filter((outcome)=>outcome.status==='Sent').length;
        const failed=result.data.length-sent;
        invitationFailures=failed>0;
        completionMessage=failed
          ?`${sent} invitation${sent===1?'':'s'} sent; ${failed} failed. Check email settings and invitation statuses.`
          :`${sent} invitation${sent===1?'':'s'} sent successfully.`;
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
      closeModal();await refresh();
      if(invitationFailures)setError(completionMessage);
      else notify(completionMessage);
    } catch(e){
      const message=e.message==='API route not found.'
        ? 'This feature is not deployed on the backend yet. Redeploy the backend, then try again.'
        : e.message;
      setError(message);
    }
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
  async function reviewApplication(record,status) {openModal({type:'review',record,status});}
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
  async function uploadOwnDocument(kind,file) {
    if(!file)return;
    setBusy(true);setError('');
    try {
      const body=new FormData();
      body.append('file',file);
      body.append('employeeId',user.id);
      await api(`/upload/${kind}`,{method:'POST',body});
      notify('Document uploaded.');
      await refresh();
    } catch(e){setError(e.message);}
    finally{setBusy(false);}
  }
  async function deleteOwnDocument(documentId) {
    if(!window.confirm('Delete this document?'))return;
    setBusy(true);setError('');
    try {await api(`/employee-documents/${documentId}`,{method:'DELETE'});notify('Document deleted.');await refresh();}
    catch(e){setError(e.message);}
    finally{setBusy(false);}
  }
  function openModal(next) {
    setError('');
    setModal(next);
  }
  function closeModal() {
    setModal(null);
    setError('');
  }
  async function logout() {
    try{await api('/auth/logout',{method:'POST'});}catch{}
    setUser(null);setData(null);setItems([]);setCsrf(null);setCsrfToken(null);setError('');navigate('Dashboard',{replace:true});
  }
  function pageAction() {
    if(page==='Employees')return()=>openModal({type:'employee'});
    if(page==='Projects')return()=>openModal({type:'project'});
    if(page==='Vendors')return()=>openModal({type:'vendor'});
    if(page==='Announcements')return()=>openModal({type:'announcement'});
    return null;
  }
  if(publicFormSlug)return <PublicFormPage slug={publicFormSlug}/>;
  if(initializing)return <LoadingScreen/>;
  if(!pageFromPath(window.location.pathname))return <NotFoundPage onNavigate={()=>navigate('Dashboard')}/>;
  if(!user)return window.location.pathname!=='/'||showLogin
    ? <AuthScreen onBack={()=>setShowLogin(false)} onLogin={(next,token)=>{setUser(next);setCsrf(token);navigate('Dashboard',{replace:true});}}/>
    : <LandingPage onLogin={()=>setShowLogin(true)}/>;
  const actionPermission={Employees:'employees.create',Projects:'projects.create',Vendors:'vendors.create',Announcements:'announcements.create','Create Email':'invitations.send','Send Email':'invitations.send','Roles & Permissions':'roles.manage'};
  const createAllowed=Boolean(actionPermission[page]&&userHasPermission(user,actionPermission[page]));
  return <div className={`app-shell${preferences.compactMode?' compact-mode':''}`}>
    <Sidebar user={user} active={page} onNavigate={(target)=>{navigate(target);setCollapsed(false);}} collapsed={collapsed} onLogout={logout} workspaceName={settings.workspaceName} supportEmail={settings.supportEmail} announcementCount={data?.announcements?.length||0}/>
    <div className="main-column"><Header user={user} page={page} query={query} setQuery={setQuery} onMenu={()=>setCollapsed(!collapsed)} onLogout={logout} onNotifications={()=>navigate('Notifications')} unreadCount={data?.activity?.filter((item)=>!item.read_at).length||0}/>
      <main className="page-content">
        {page==='Dashboard'?<>{!dismissed&&!preferences.hideWelcome&&<Welcome user={user} employee={employee} dismiss={false} onDismiss={()=>setDismissed(true)} workspaceName={settings.workspaceName}/>}{error&&<div className="error-banner" role="alert">{error}<button onClick={()=>setError('')}><X size={14}/></button></div>}{data?(data.role==='team'?<TeamDashboard data={data} user={user} onNavigate={navigate}/>:employee?<EmployeeDashboard data={data} onNavigate={navigate} onApply={apply}/>:<AdminDashboard data={data} permissions={user.permissions} onNavigate={navigate}/>):<div className="dashboard-loading"><LoaderCircle className="spin"/>Loading your dashboard…</div>}</>:<><div className="page-title-row"><div><span className="eyebrow">{employee?'ANNOTATOR WORKSPACE':'ANNOTRA TEAM WORKSPACE'}</span><h1>{page}</h1><p>{page==='Forms'?'Build shareable forms, collect responses, and export your data.':page==='Roles & Permissions'?'Create role profiles and choose which permissions each role receives.':page==='Employees'?'Review registrations, manage account status, and assign authorized roles.':page==='Create Email'?'Create reusable email templates for later sending.':page==='Send Email'?'Choose a saved template or write a custom email, then review and send it.':employee?`Welcome back, ${user.name.split(' ')[0]}. Here's your ${page.toLowerCase()} view.`:`Manage ${page.toLowerCase()} for your annotation team.`}</p></div>{createAllowed&&pageAction()&&<button className="button primary" onClick={pageAction()}><Plus size={16}/>{page==='Roles & Permissions'?'Create Role':`Add ${page==='Employees'?'Employee':page==='Projects'?'Project':page==='Vendors'?'Vendor':'Announcement'}`}</button>}</div>{error&&<div className="error-banner" role="alert">{error}<button onClick={()=>setError('')}><X size={14}/></button></div>}
          {listLoading&&<ListLoading/>}
          {page==='Settings'?<SettingsPage settings={settings} preferences={preferences} canManageSettings={user.permissions?.includes('settings.manage')||user.role==='Super Admin'} onSaveSettings={saveSettings} onSavePreferences={savePreferences} busy={busy}/>
          :page==='Forms'?<FormsPage/>
          :page==='Create Email'||page==='Send Email'?<EmailStudioPage mode={page==='Create Email'?'create':'send'} lookups={lookups} invitations={items} emailConfig={emailConfig} templates={emailTemplates} currentUser={user} templatesSupported={templatesSupported} onChanged={refresh} notify={notify}/>
          :page==='Messages'||page==='Support'?<MessagesPage page={page} supportEmail={settings.supportEmail}/>
          :page==='Reports'?<ReportsPage items={items}/>
          :page==='My Profile'?<ProfilePage user={user} profile={items[0]} onEditProfile={(record)=>openModal({type:'profile',record})} onUploadDocument={uploadOwnDocument} onDeleteDocument={deleteOwnDocument}/>
          :page==='Roles & Permissions'?<RolePermissionsPage roles={items} permissions={lookups.permissions||[]} currentUser={user} onCreate={()=>openModal({type:'role'})} onSave={saveRolePermissions} busy={busy}/>
          :<>{['My Projects','Available Projects','My Applications'].includes(page)?<ProjectListsPage page={page} items={items} query={query} applyingProjectId={applyingProjectId} onApply={apply}/>:<DataPage page={page} items={items} query={query} filters={page==='Employees'?employeeFilters:listFilters} pagination={page==='Employees'?employeePagination:['Projects','Vendors','Applications'].includes(page)?listPagination:null} onApplyEmployeeFilters={applyEmployeeFilters} onApplyFilters={applyListFilters} employeeTypes={lookups.employeeTypes||[]} canCreate={createAllowed} canApproveEmployees={user.permissions?.includes('employees.approve')} canAssignRoles={user.permissions?.includes('employees.assign_role')} canEditEmployees={user.permissions?.includes('employees.edit')||user.role==='Super Admin'} user={user} roles={lookups.roles||[]} vendors={lookups.vendors||[]} onCreate={pageAction()} onReview={reviewApplication} onReviewEmployee={reviewEmployee} onAssignRole={assignEmployeeRole} onToggle={toggleEmployee} onResetPassword={(record)=>openModal({type:'resetPassword',record})} onEdit={(record)=>{if(page==='Roles & Permissions')openModal({type:'role',record});else if(page==='Employees')openModal({type:'employee',record});else if(page==='Projects')openModal({type:'project',record});else if(page==='Vendors')openModal({type:'vendor',record});else if(page==='Announcements')openModal({type:'announcement',record});}} onDelete={deleteRole} emailConfigured={emailConfig.configured} emailMissing={emailConfig.missing} emailFrom={emailConfig.from}/>}</>}
        </>}
      </main>
    </div>
    {collapsed&&<button className="mobile-scrim" onClick={()=>setCollapsed(false)} aria-label="Close sidebar"/>}
    {toast&&<div className="toast" role="status" aria-live="polite"><CircleCheckBig size={16}/>{toast}</div>}
    {modal&&<Modal type={modal.type} lookups={lookups} record={modal.record||{}} onClose={closeModal} onSubmit={submitModal} busy={busy} emailConfigured={emailConfig.configured} emailMissing={emailConfig.missing} emailFrom={emailConfig.from} errorMessage={error}/>}
  </div>;
}
