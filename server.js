/* ═══════════════════════════════════════════════════════════════
   ASL — Node.js Dev Server  (server.js)
   Serves the site and injects .env values as <meta> tags so that
   keys never appear in committed source files.
   Run:  node server.js
   ═══════════════════════════════════════════════════════════════ */

require('dotenv').config();                    // loads .env into process.env
const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Meta-tag injection middleware ──
// Intercepts HTML responses and inserts config <meta> tags right after <head>
app.use((req, res, next) => {
  // Only process HTML requests
  if (!req.path.endsWith('.html') && req.path !== '/' && !req.path.match(/\/[^.]*$/)) {
    return next();
  }

  // Resolve file path
  let filePath = path.join(__dirname, req.path === '/' ? 'index.html' : req.path);
  if (!filePath.endsWith('.html')) filePath += '.html';

  if (!fs.existsSync(filePath)) return next();

  let html = fs.readFileSync(filePath, 'utf-8');

  const metaTags = `
  <meta name="asl-supabase-url"      content="${process.env.SUPABASE_URL      || ''}">
  <meta name="asl-supabase-anon-key" content="${process.env.SUPABASE_ANON_KEY || ''}">
  <meta name="asl-razorpay-key"      content="${process.env.RAZORPAY_KEY_ID   || ''}">
  <meta name="asl-admin-secret"      content="${process.env.ADMIN_SECRET_KEY  || 'ASLADMIN2026'}">`;

  // Inject right after <head>
  html = html.replace('<head>', '<head>' + metaTags);

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// ── Static file serving ──
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`\n🏸  ASL Dev Server running at http://localhost:${PORT}`);
  console.log(`    Supabase URL : ${process.env.SUPABASE_URL || '(not set)'}`);
  console.log(`    RazorPay Key : ${process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.slice(0,12)+'...' : '(not set)'}\n`);
});
