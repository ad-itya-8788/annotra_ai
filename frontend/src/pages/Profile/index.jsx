import React from 'react';
import { Panel, StatusBadge } from '../../components/ui/index.jsx';
import './index.css';

export default function ProfilePage({ user, profile, onEditProfile, onUploadDocument, onDeleteDocument }) {
  return <Panel title="My Profile" action={{label:'Edit Profile',onClick:()=>onEditProfile(profile||{})}}><div className="profile-card">{profile?.profile_photo_url?<img className="avatar profile-avatar" src={profile.profile_photo_url} alt="Profile"/>:<span className="avatar profile-avatar">{user.name?.split(' ').map((part)=>part[0]).slice(0,2).join('')}</span>}<div><h2>{user.name}</h2><p>{user.role} · {user.mobile}</p><StatusBadge value={profile?.status||'Active'}/><small className="profile-email">{profile?.email}</small></div></div><div className="profile-documents">{[['profile-photo','Profile Photo','image/*',profile?.profile_photo_url],['resume','Resume','application/pdf,.doc,.docx',profile?.resume_url],['id-proof','ID Proof','application/pdf,.jpg,.jpeg,.png',profile?.id_proof_url]].map(([kind,label,accept,url])=>{const document=profile?.documents?.find((item)=>item.document_type===kind);return <label key={kind}><span><b>{label}</b><small>{url?<a href={url} target="_blank" rel="noreferrer">View current file</a>:'Not uploaded'}</small></span><div className="profile-file-actions"><input type="file" accept={accept} onChange={(event)=>onUploadDocument(kind,event.target.files?.[0])}/>{document&&<button type="button" className="mini-action reject" onClick={()=>onDeleteDocument(document.id)}>Delete</button>}</div></label>})}</div></Panel>;
}


