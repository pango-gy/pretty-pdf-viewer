const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8080;

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
          }
          a {
            color: white;
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Pretty PDF Viewer Demo</h1>
          <p>Available demos:</p>
          <p><a href="/demo/threejs-demo.html">Three.js 3D Animation Demo</a></p>
          <p><a href="/demo/index.html">Main Demo</a></p>
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

app.listen(PORT, () => {
  console.log(`🚀 Demo server is running at http://localhost:${PORT}`);
  console.log(`📄 Open http://localhost:${PORT} to see the demo`);
  console.log(`📂 Available demos:`);
  console.log(`   - http://localhost:${PORT}/demo/threejs-demo.html`);
  console.log(`   - http://localhost:${PORT}/demo/index.html`);
});