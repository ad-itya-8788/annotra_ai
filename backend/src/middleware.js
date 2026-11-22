import { pool } from './db.js';
import { config } from './config.js';

export function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

async function loadActiveUser(id) {
  const { rows } = await pool.query(
    `SELECT e.id,e.full_name AS name,e.mobile,r.name AS role,
      COALESCE(array_agg(DISTINCT p.code) FILTER(WHERE p.code IS NOT NULL),'{}') AS permissions
     FROM employees e JOIN roles r ON r.id=e.role_id
     LEFT JOIN role_permissions rp ON rp.role_id=r.id
     LEFT JOIN permissions p ON p.id=rp.permission_id
     WHERE e.id=$1 AND e.status='active'
     GROUP BY e.id,r.id`,
    [id],
  );
  return rows[0] || null;
}

function syncSessionUser(req, user) {
  const current = req.session.user;
  const permissions = (value) => [...(value || [])].sort().join(',');
  const unchanged = current
    && current.id === user.id
    && current.name === user.name
    && current.role === user.role
    && permissions(current.permissions) === permissions(user.permissions);
  if (!unchanged) req.session.user = user;
}

export async function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Authentication required.' });
  try {
    const user=await loadActiveUser(req.session.user.id);
    if(!user){
      await new Promise((resolve)=>req.session.destroy(()=>resolve()));
      res.clearCookie('projectflow.sid');
      return res.status(401).json({error:'This account is inactive or no longer exists.'});
    }
    syncSessionUser(req, user);
    next();
  } catch(error) {
    next(error);
  }
}

export async function hasPermission(user, code) {
  if (!user) return false;
  if (user.role && Array.isArray(user.permissions)) {
    return user.role === 'Super Admin' || user.permissions.includes(code);
  }
  const current=await loadActiveUser(user.id);
  if(!current)return false;
  Object.assign(user,current);
  return current.role==='Super Admin'||current.permissions.includes(code);
}

export async function requirePermission(req, res, next) {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'Authentication required.' });
    const user=await loadActiveUser(req.session.user.id);
    if(!user){
      await new Promise((resolve)=>req.session.destroy(()=>resolve()));
      res.clearCookie('projectflow.sid');
      return res.status(401).json({error:'This account is inactive or no longer exists.'});
    }
    syncSessionUser(req, user);
    if (user.role!=='Super Admin'&&!user.permissions.includes(req.permission)) return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    next();
  } catch (error) {
    next(error);
  }
}

export function permission(code) {
  return (req, res, next) => {
    req.permission = code;
    return requirePermission(req, res, next);
  };
}

const allowedOrigins = new Set([
  config.frontendUrl,
  ...(config.nodeEnv === 'production' ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173']),
]);

const publicAuthPaths = [
  '/auth/login',
  '/auth/send-otp',
  '/auth/verify-otp',
  '/auth/register/send-otp',
  '/auth/register/verify-otp',
];

export function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({ error: 'Request origin is not allowed.' });
  }
  if (!req.session.user || publicAuthPaths.some((path) => req.path === path)) return next();
  const token = req.get('x-csrf-token');
  if (!token || token !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token.' });
  }
  next();
}
