const express = require('express');
const { execFile, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

app.disable('x-powered-by');
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  extensions: ['html'],
  setHeaders: (res, fp) => {
    if (fp.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

const jobs = new Map();

setInterval(() => {
  const now = Date.now();
  jobs.forEach((job, id) => { if (now - job.startTime > 1800000) jobs.delete(id); });
  try {
    fs.readdirSync(DOWNLOAD_DIR).forEach(f => {
      const fp = path.join(DOWNLOAD_DIR, f);
      try {
        const stat = fs.statSync(fp);
        if (now - stat.mtimeMs > 1800000) fs.unlink(fp, () => {});
      } catch (e) {}
    });
  } catch (e) {}
}, 300000);

app.post('/api/info', (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'Please provide a valid link' });
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error('bad');
  } catch (e) { return res.status(400).json({ error: 'Invalid URL format' }); }

  execFile('yt-dlp', ['-J', '--no-playlist', '--no-warnings', '--socket-timeout', '15', url],
    { maxBuffer: 1024 * 1024 * 40, timeout: 45000 },
    (err, stdout) => {
      if (err) {
        console.error('INFO ERROR:', err.message);
        return res.status(500).json({ error: 'Could not fetch video. Link may be private or unsupported.' });
      }
      let info;
      try { info = JSON.parse(stdout); } catch (e) {
        return res.status(500).json({ error: 'Failed to process video data' });
      }

      const byHeight = new Map();
      (info.formats || []).forEach(f => {
        if (!f.vcodec || f.vcodec === 'none') return;
        if (!f.height) return;
        const existing = byHeight.get(f.height);
        const score = (f.tbr || 0) + (f.fps || 0);
        const filesize = f.filesize || f.filesize_approx || 0;
        const audioOverhead = 128000 / 8 * (info.duration || 0);
        const estimatedSize = filesize > 0 ? filesize + audioOverhead : 0;
        if (!existing || score > existing.score) {
          byHeight.set(f.height, {
            height: f.height, formatId: f.format_id, fps: f.fps || 0,
            filesize: filesize, estimatedSize, score
          });
        }
      });

      const qualities = Array.from(byHeight.values())
        .sort((a, b) => b.height - a.height)
        .map(q => ({
          height: q.height, formatId: q.formatId, fps: q.fps,
          filesize: q.estimatedSize || q.filesize,
          label: getLabel(q.height), badge: getBadge(q.height)
        }));

      res.json({
        title: info.title || 'Untitled Video',
        thumbnail: info.thumbnail || '',
        duration: info.duration || 0,
        uploader: info.uploader || info.channel || 'Unknown',
        platform: detectPlatform(url),
        qualities
      });
    });
});

function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    if (host.includes('youtube') || host === 'youtu.be') return 'youtube';
    if (host.includes('tiktok')) return 'tiktok';
    if (host.includes('instagram')) return 'instagram';
    if (host.includes('facebook') || host === 'fb.watch') return 'facebook';
    if (host.includes('twitter') || host === 'x.com' || host === 't.co') return 'twitter';
    if (host.includes('reddit')) return 'reddit';
    if (host.includes('vimeo')) return 'vimeo';
    if (host.includes('twitch')) return 'twitch';
    return 'generic';
  } catch { return 'generic'; }
}

function getLabel(h) {
  if (h >= 2160) return '4K';
  if (h >= 1440) return '2K';
  if (h >= 1080) return 'Full HD';
  if (h >= 720) return 'HD';
  if (h >= 480) return 'SD';
  return 'Low';
}
function getBadge(h) {
  if (h >= 2160) return { text: 'Ultra HD', color: 'gold' };
  if (h >= 1440) return { text: 'Quad HD', color: 'purple' };
  if (h >= 1080) return { text: 'Popular', color: 'blue' };
  if (h >= 720) return { text: 'Recommended', color: 'green' };
  return null;
}

app.post('/api/start', (req, res) => {
  const { url, format, formatId, quality } = req.body || {};
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  const jobId = 'job_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const outputTemplate = path.join(DOWNLOAD_DIR, `${jobId}.%(ext)s`);
  const job = {
    id: jobId, status: 'starting', progress: 0,
    speed: '', eta: '', totalSize: '',
    file: null, error: null, startTime: Date.now()
  };
  jobs.set(jobId, job);

  let args = ['--no-playlist', '--no-warnings', '--newline',
    '--socket-timeout', '20', '--retries', '3',
    '-o', outputTemplate];

  if (format === 'mp3') {
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
  } else {
    if (formatId && formatId !== 'best') {
      args.push('-f', `${formatId}+bestaudio/${formatId}/bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]/best`);
    } else if (quality && quality !== 'best') {
      args.push('-f', `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]/best`);
    } else {
      args.push('-f', 'bestvideo+bestaudio/best');
    }
    args.push('--merge-output-format', 'mp4');
  }
  args.push(url);

  console.log(`🎬 [${jobId}]`);
  const ytDlp = spawn('yt-dlp', args);

  const spawnTimeout = setTimeout(() => {
    if (job.status === 'starting' && job.progress === 0) {
      try { ytDlp.kill('SIGKILL'); } catch (e) {}
      job.status = 'error';
      job.error = 'Download timeout. Try another link.';
    }
  }, 35000);

  let lastProgress = 0;
  let lastChangeTime = Date.now();
  const watchdog = setInterval(() => {
    if (job.status === 'downloading') {
      if (job.progress !== lastProgress) {
        lastProgress = job.progress;
        lastChangeTime = Date.now();
      } else if (Date.now() - lastChangeTime > 90000) {
        try { ytDlp.kill('SIGKILL'); } catch (e) {}
        job.status = 'error';
        job.error = 'Download stalled. Try again.';
      }
    }
    if (Date.now() - job.startTime > 600000) {
      try { ytDlp.kill('SIGKILL'); } catch (e) {}
      job.status = 'error';
      job.error = 'Download took too long.';
    }
  }, 5000);

  ytDlp.stdout.on('data', (data) => {
    const text = data.toString();
    const p = text.match(/\[download\]\s+([\d.]+)%/);
    if (p) { job.status = 'downloading'; job.progress = parseFloat(p[1]); }
    const sp = text.match(/at\s+([\d.]+\w+\/s)/); if (sp) job.speed = sp[1];
    const et = text.match(/ETA\s+([\d:]+)/); if (et) job.eta = et[1];
    const sz = text.match(/of\s+~?\s*([\d.]+\w+)/); if (sz) job.totalSize = sz[1];
    if (text.includes('[Merger]') || text.includes('Merging')) {
      job.status = 'merging'; job.progress = 99; job.speed = ''; job.eta = '';
    }
    if (text.includes('[ExtractAudio]')) { job.status = 'merging'; job.progress = 99; }
  });

  ytDlp.stderr.on('data', (d) => {
    const m = d.toString();
    if (m.toLowerCase().includes('error')) console.error(`[${jobId}]`, m.trim().slice(0, 200));
  });

  ytDlp.on('error', (err) => {
    job.status = 'error';
    job.error = err.code === 'ENOENT' ? 'yt-dlp not installed.' : 'Could not start.';
  });

  ytDlp.on('close', (code) => {
    clearTimeout(spawnTimeout);
    clearInterval(watchdog);
    console.log(`✅ [${jobId}] exit ${code}`);

    if (job.status === 'error') return;

    if (code === 0) {
      const files = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.startsWith(jobId));
      if (files.length > 0) {
        let finalFile = files[0], maxSize = 0;
        files.forEach(f => {
          const sz = fs.statSync(path.join(DOWNLOAD_DIR, f)).size;
          if (sz > maxSize) { maxSize = sz; finalFile = f; }
        });
        files.forEach(f => { if (f !== finalFile) fs.unlink(path.join(DOWNLOAD_DIR, f), () => {}); });
        job.status = 'completed';
        job.progress = 100;
        job.file = finalFile;
      } else {
        job.status = 'error';
        job.error = 'File not created.';
      }
    } else if (!job.error) {
      job.status = 'error';
      job.error = 'Download failed. Try different quality.';
    }
  });

  res.json({ jobId });
});

app.get('/api/status/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ status: 'error', error: 'Job not found' });
  res.json({
    status: job.status, progress: job.progress,
    speed: job.speed, eta: job.eta, totalSize: job.totalSize,
    file: job.file, error: job.error
  });
});

app.get('/api/file/:name', (req, res) => {
  const name = path.basename(req.params.name);
  const fp = path.join(DOWNLOAD_DIR, name);
  if (!fs.existsSync(fp)) return res.status(404).send('Not found');
  res.download(fp, name, (err) => { if (!err) fs.unlink(fp, () => {}); });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: Math.floor(process.uptime()) }));

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /downloads/\n\nSitemap: /sitemap.xml`);
});

app.get('/sitemap.xml', (req, res) => {
  const base = req.protocol + '://' + req.get('host');
  const pages = ['', 'how-to-use', 'about', 'privacy', 'terms', 'contact', 'dmca'];
  const urls = pages.map(p => `  <url><loc>${base}/${p}</loc><changefreq>weekly</changefreq><priority>${p === '' ? '1.0' : '0.7'}</priority></url>`).join('\n');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`);
});

app.get('/ads.txt', (req, res) => {
  res.type('text/plain').send('# AdSense publisher ID — replace after approval\ngoogle.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n');
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => console.log(`✅ http://localhost:${PORT}`));
