import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5555;

// CORS 헤더 설정
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Static 파일 제공
app.use('/dist', express.static(path.join(__dirname, 'dist')));
app.use('/demo', express.static(path.join(__dirname, 'demo')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// 메인 페이지
app.get('/', (req, res) => {
  const demoPath = path.join(__dirname, 'demo', 'threejs-demo.html');
  if (fs.existsSync(demoPath)) {
    res.sendFile(demoPath);
  } else {
    // 대체 페이지
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pretty PDF Viewer Demo</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            text-align: center;
            color: white;
            padding: 20px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
          }
          h1 { margin-bottom: 20px; }
          a {
            color: white;
            text-decoration: none;
            display: block;
            padding: 10px 20px;
            margin: 10px 0;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            transition: all 0.3s;
          }
          a:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎨 Pretty PDF Viewer Demo</h1>
          <p>Choose a demo:</p>
          <a href="/demo/threejs-demo.html">✨ Three.js 3D Animation Demo</a>
          <a href="/demo/index.html">📄 Main Demo</a>
          <a href="/demo/vanilla/index.html">🍦 Vanilla JS Demo</a>
        </div>
      </body>
      </html>
    `);
  }
});

// PDF.js worker 파일 제공
app.get('/pdf.worker.js', (req, res) => {
  const workerPath = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.js');
  if (fs.existsSync(workerPath)) {
    res.sendFile(workerPath);
  } else {
    res.status(404).send('PDF.js worker not found');
  }
});

// 404 처리
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>404 - Not Found</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          text-align: center;
        }
        a {
          color: white;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>404 - Page Not Found</h1>
        <p>The requested page was not found.</p>
        <p><a href="/">Go to Home</a></p>
      </div>
    </body>
    </html>
  `);
});

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Demo server is running!`);
  console.log(`📄 Open http://localhost:${PORT} to see the demo\n`);
  console.log(`Available demos:`);
  console.log(`  • http://localhost:${PORT}/demo/threejs-demo.html - Three.js 3D Animation`);
  console.log(`  • http://localhost:${PORT}/demo/index.html - Main Demo`);
  console.log(`  • http://localhost:${PORT}/demo/vanilla/index.html - Vanilla JS Demo\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});