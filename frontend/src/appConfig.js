import {
  Activity, Bell, BarChart3, BriefcaseBusiness, Building2, ClipboardList, FilePlus2, FolderClosed,
  Headphones, LayoutDashboard, Mail, Megaphone, MessageSquare, Send, Settings, Shield, UserRound, Users,
} from 'lucide-react';

export const adminNav = [
  ['Dashboard', LayoutDashboard], ['Employees', Users], ['Projects', FolderClosed], ['Vendors', Building2], ['Forms', FilePlus2],
  ['Applications', ClipboardList], ['Announcements', Megaphone], ['Create Email', Mail], ['Send Email', Send],
  ['Roles & Permissions', Shield], ['Reports', BarChart3], ['Audit Logs', Activity], ['Settings', Settings],
];
export const employeeNav = [
  ['Dashboard', LayoutDashboard], ['My Projects', FolderClosed], ['Available Projects', BriefcaseBusiness],
  ['My Applications', ClipboardList], ['Announcements', Megaphone], ['My Profile', UserRound],
  ['Messages', MessageSquare], ['Support', Headphones], ['Settings', Settings],
];
export const teamLeadNav = [['Dashboard', LayoutDashboard], ['Projects', FolderClosed], ['Applications', ClipboardList], ['Announcements', Megaphone], ['Settings', Settings]];
export const reviewerNav = [['Dashboard', LayoutDashboard], ['Projects', FolderClosed], ['Announcements', Megaphone], ['Settings', Settings]];
export const endpoints = {
  Employees: '/employees', Projects: '/projects', Vendors: '/vendors', Applications: '/applications',
  Announcements: '/announcements', 'Roles & Permissions': '/roles', 'Create Email': '/invitations', 'Send Email': '/invitations', Notifications:'/notifications',
  'Audit Logs': '/audit-logs',
};
export const pageIcons = { Employees: Users, Projects: FolderClosed, Vendors: Building2, Forms: FilePlus2, Applications: ClipboardList, Announcements: Megaphone };
export const navPermission = {
  Employees: 'employees.view', Projects: 'projects.view', Vendors: 'vendors.view', Applications: 'applications.view',
  Announcements: 'announcements.view', 'Create Email': 'invitations.send', 'Send Email': 'invitations.send',
  Forms: 'forms.manage', 'Roles & Permissions': 'roles.manage', Reports: 'reports.view', 'Audit Logs': 'audit.view',
};
export const userHasPermission = (user, code) => user?.role === 'Super Admin' || user?.permissions?.includes(code);
export const fmtDate = (value) => value ? new Date(value).toLocaleDateString('en-CA') : '—';
export const routePages = [...new Set([
  ...adminNav, ...employeeNav, ...teamLeadNav, ...reviewerNav,
  ['Reports', BarChart3], ['Notifications', Bell],
].map(([label]) => label))];
export const routeSlug = (label) => label.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const pageFromPath = (pathname) => pathname === '/'
  ? 'Dashboard'
  : pathname.replace(/\/+$/, '').toLowerCase() === '/email-invitations'
    ? 'Send Email'
  : pathname.replace(/\/+$/, '').toLowerCase() === '/logout'
    ? 'Dashboard'
    : routePages.find((label) => `/${routeSlug(label)}` === pathname.replace(/\/+$/, '').toLowerCase()) || null;
export const publicFormSlugFromPath = (pathname) => pathname.match(/^\/forms\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/i)?.[1] || null;
export const initialEmployeeFilters = () => {
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
export const initialListFilters = () => {
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

