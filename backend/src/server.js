import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { pool } from './db.js';
import { router } from './routes.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: config.frontendUrl, credentials: true } });
app.set('io', io);
const PgSession = connectPgSimple(session);
const sessionMiddleware = session({
  name: 'projectflow.sid',
  store: new PgSession({ pool, tableName: 'auth_sessions', createTableIfMissing: false, pruneSessionInterval: 60 }),
  secret: config.sessionSecret || 'development-session-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: config.nodeEnv === 'production', sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 },
});

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

app.use(sessionMiddleware);
app.get('/robots.txt', (_req, res) => {
  const sitemapUrl = new URL('/sitemap.xml', config.frontendUrl).toString();
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /dashboard\nDisallow: /employees\nDisallow: /projects\nDisallow: /vendors\nDisallow: /applications\nDisallow: /announcements\nDisallow: /settings\nDisallow: /roles-and-permissions\nDisallow: /audit-logs\nDisallow: /email-invitations\nSitemap: ${sitemapUrl}\n`,
  );
});
app.get('/sitemap.xml', (_req, res) => {
  const siteUrl = new URL('/', config.frontendUrl).toString();
  const xmlUrl = siteUrl.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${xmlUrl}</loc></url></urlset>\n`,
  );
});
app.get('/api/health', async (_req,res)=>{
  try {
    await pool.query('SELECT 1');
    res.json({status:'ok',database:'connected',message:'Database connected and everything is running.'});
  } catch {
    res.status(503).json({status:'error',database:'unavailable',message:'Server is running, but the database connection is unavailable.'});
  }
});
app.use('/api',router);
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
const frontendDist = resolve(dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
if (config.nodeEnv === 'production' && existsSync(frontendDist)) {
  app.use(express.static(frontendDist, { index: false }));
  app.get('*', (req, res, next) => {
    if (req.path === '/api' || req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API route not found.' });
    }
    if (!req.accepts('html')) return next();
    return res.sendFile(resolve(frontendDist, 'index.html'));
  });
} else {
  if (config.nodeEnv === 'production') {
    console.warn(`Frontend build not found at ${frontendDist}; configure a static host fallback or run the frontend build.`);
  }
  app.get('/', async (_req,res)=>{
    try {
      await pool.query('SELECT 1');
      res.type('text/plain').send('Database connected and everything is running.');
    } catch {
      res.status(503).type('text/plain').send('Backend is running, but the database connection is unavailable.');
    }
  });
}
app.use((error,_req,res,_next)=>{
  console.error(error);
  res.status(500).json({error:'An unexpected server error occurred.'});
});

const server=httpServer.listen(config.port,()=>{
  console.log(`ProjectFlow API listening on http://localhost:${config.port}`);
});

for(const signal of ['SIGINT','SIGTERM']){
  process.on(signal,()=>server.close(async()=>{
    await pool.end();
    process.exit(0);
  }));
}
