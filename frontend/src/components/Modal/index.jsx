import React, { useState } from 'react';
import { Check, Eye, EyeOff, LoaderCircle, LockKeyhole, Plus, Send, X } from 'lucide-react';
import SearchableMultiSelect from '../SearchableMultiSelect/index.jsx';
import './index.css';

export default function Modal({ type, lookups, record, onClose, onSubmit, busy, emailConfigured, emailMissing, emailFrom, errorMessage }) {
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
    expiresAt:record.expires_at?.slice(0,16)||'',isPublished:record.is_published===true,
    targetAll:record.id?(record.target_all!==false?'true':'false'):'true',
    employeeIds:record.id?(record.employee_ids||[]):[],
  }:type==='invite'?{
    projectId:'',employeeIds:[],subject:'Project invitation',message:'Hello,\n\nYou have been invited to join a new annotation project. Please review the details and contact your administrator if you have any questions.\n\nThank you,\nAnnotra AI',
  }:type==='resetPassword'?{
    password:'',confirmPassword:'',
  }:{});
  const [showPassword,setShowPassword]=useState(false);
  const set=(key,value)=>setValues((current)=>({...current,[key]:value}));
  const configs={
    employee:{title: isEdit ? 'Edit Employee' : 'Add New Employee',fields:[['fullName','Full Name'],['email','Email','email'],['mobile','Mobile Number','tel'],['dateOfBirth','Date of Birth','date'],['gender','Gender','select',[['Female','Female'],['Male','Male'],['Non-binary','Non-binary'],['Prefer not to say','Prefer not to say']]],['address','Address','textarea'],['skills','Skills (comma separated)'],['experienceYears','Experience (years)','number'],['highestQualification','Highest Qualification'],['city','City'],['linkedinUrl','LinkedIn URL'],['employeeType','Employee Type'],['roleId','Assigned Role','select',lookups.roles?.map((r)=>[r.id,r.name])],['status','Status','select',[['active','Active'],['inactive','Inactive']]],...(isEdit?[]:[['profilePhoto','Profile Photo','file','image/*'],['resume','Resume','file','.pdf,.doc,.docx'],['idProof','ID Proof','file','.pdf,.jpg,.jpeg,.png']])]},
    project:{title: isEdit ? 'Edit Project' : 'Add New Project',fields:[['name','Project Name'],['code','Project Code'],['vendorId','Vendor (optional)','select',lookups.vendors?.map((v)=>[v.id,v.company_name])],['description','Description','textarea'],['instructions','Project Instructions','textarea'],['requiredSkills','Required Skills (comma separated)'],['requiredAnnotators','Number of Annotators','number'],['startDate','Start Date','date'],['endDate','End Date','date'],['applicationDeadline','Application Deadline','date'],['projectType','Project Type'],['estimatedBudget','Estimated Budget','number'],['status','Project Status','select',[['Draft','Draft'],['Published','Published'],['In Progress','In Progress'],['Completed','Completed'],['On Hold','On Hold'],['Cancelled','Cancelled']]],...(isEdit?[]:[['attachment','Project Attachment','file','.pdf,.doc,.docx,.png,.jpg,.jpeg']])]},
    vendor:{title: isEdit ? 'Edit Vendor' : 'Add New Vendor',fields:[['companyName','Company Name'],['contactPerson','Contact Person'],['email','Email','email'],['mobile','Mobile Number','tel'],['address','Address','textarea'],['companyDetails','Company Details','textarea'],...(isEdit?[['status','Status','select',[['active','Active'],['inactive','Inactive']]]]:[])]},
    announcement:{
      title: isEdit ? 'Edit Announcement' : 'Create Announcement',
      fields: [
        ['title','Title'],
        ['body','Announcement Message','textarea'],
        ['priority','Priority','select',[['Low','Low'],['Normal','Normal'],['High','High'],['Urgent','Urgent']]],
        ['publishAt','Publish Date','date'],
         ['expiresAt','Expiry Date','date'],
         ['targetAll','Audience','select',[['true','All Employees'],['false','Selected Employees']]],
         ...(values.targetAll==='false'
           ? [['employeeIds','Select Employees','multiselect',lookups.employees?.map((employee)=>[employee.id,`${employee.full_name} - ${employee.email}`])]]
           : []),
       ],
    },
    invite:{title:'Send Project Invitations',fields:[['projectId','Project','select',lookups.projects?.map((p)=>[p.id,p.name])],['employeeIds','Select Employees','multiselect',lookups.invitationRecipients?.map((employee)=>[employee.id,`${employee.full_name} - ${employee.email}`])],['subject','Email Subject'],['message','Invitation Message','textarea']]},
    resetPassword:{title:`Reset Password · ${record.full_name||'Employee'}`,fields:[['password','New Password','password'],['confirmPassword','Confirm New Password','password']]},
    review:{title:`${record.status} Application`,fields:[['remarks','Admin Remarks','textarea']]},
    role:{title: isEdit ? 'Edit Role' : 'Create Role',fields:[['name','Role Name'],['description','Description','textarea']]},
    profile:{title:'Update Profile',fields:[['fullName','Full Name'],['email','Email','email'],['dateOfBirth','Date of Birth','date'],['gender','Gender','select',[['Female','Female'],['Male','Male'],['Non-binary','Non-binary'],['Prefer not to say','Prefer not to say']]],['address','Address','textarea'],['skills','Skills (comma separated)'],['experienceYears','Experience (years)','number']]},
  };
  const config=configs[type];
  const handleSubmit=(event)=>{event.preventDefault();onSubmit(values);};
  return <div className="modal-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)onClose();}}><section className={`modal-card ${type==='invite'?'invite-modal':''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <header><div><span className="modal-icon"><Plus size={17}/></span><h2 id="modal-title">{config.title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={17}/></button></header>
    <form onSubmit={handleSubmit}>
      {errorMessage&&<div className="inline-error modal-inline-error" role="alert">{errorMessage}</div>}
      {type==='invite'&&<div className={`invite-modal-note${emailConfigured===false?' invite-config-notice':''}`} role={emailConfigured===false?'alert':undefined}>
        {emailConfigured===false
          ? <>Email is not configured. Add {emailMissing?.length?emailMissing.join(', '):'EMAIL_USER, EMAIL_PASSWORD, and EMAIL_FROM'} to the backend environment and restart it before sending.</>
          : <><Send size={14}/> {emailFrom?`Sending from ${emailFrom}. `:''}Select a project and at least one active employee with an email address.</>}
      </div>}
      {type==='resetPassword'&&<div className="reset-password-note"><LockKeyhole size={14}/> The password must be 12–128 characters and include lowercase, uppercase, and numeric characters. Other active sessions for this employee will be signed out.</div>}
      <div className="modal-fields">{config.fields.map(([key,label,kind,options])=>kind==='multiselect'
        ?<div key={key} className="modal-field span-two"><span className="modal-field-label">{label}</span><SearchableMultiSelect options={options||[]} selected={values[key]||[]} onChange={(selected)=>set(key,selected)} label={label} emptyMessage={type==='invite'?'No active employees with email addresses. Add employee emails before sending invitations.':'No active employees available.'}/></div>
        :kind==='password'
          ?<label key={key} className="span-two">{label}<div className="password-input"><input type={showPassword?'text':'password'} autoComplete="new-password" minLength={12} maxLength={128} placeholder="Enter a strong password" value={values[key]||''} onChange={(e)=>set(key,e.target.value)} required/><button type="button" onClick={()=>setShowPassword((visible)=>!visible)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={15}/>:<Eye size={15}/>}</button></div></label>
          :<label key={key} className={kind==='textarea'?'span-two':''}>{label}
            {kind==='textarea'?<textarea rows="4" placeholder={`Enter ${label.toLowerCase()}`} value={values[key]||''} onChange={(e)=>set(key,e.target.value)} required={['fullName','title','body','message'].includes(key)}/>:kind==='select'?<select value={values[key]||''} onChange={(e)=>set(key,e.target.value)} required={key!=='vendorId'}><option value="">{key==='vendorId'?'No vendor':'Select '+label.toLowerCase()}</option>{options?.map(([value,name])=><option key={value} value={value}>{name}</option>)}</select>:kind==='file'?<input type="file" accept={options} onChange={(e)=>set(key,e.target.files?.[0]||null)}/>:<input type={['date','email','tel','number'].includes(kind)?kind:'text'} placeholder={kind==='date'?undefined:`Enter ${label.toLowerCase()}`} value={values[key]||''} onChange={(e)=>set(key,e.target.value)} required={['fullName','email','mobile','name','code','companyName','contactPerson','projectId','subject','roleId','password','confirmPassword'].includes(key)}/>}
          </label>)}</div><div className="modal-footer"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy||(type==='invite'&&(emailConfigured!==true||!(values.employeeIds||[]).length))}>{busy?<LoaderCircle className="spin" size={15}/>:type==='invite'?<Send size={15}/>:<Check size={15}/>} {type==='invite'?'Send Invitations':type==='resetPassword'?'Update Password':'Save'}</button></div></form>
  </section></div>;
}

