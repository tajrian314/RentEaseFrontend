const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;

let properties = [
  {
    id: 'prop-1',
    name: 'Green View Apartment',
    location: 'Zakir Hossain Road, East Nasirabad, Chittagong',
    rent: 55000,
    type: 'family',
    details: '3 Bed • 3 Bath • 3 Corridor',
    status: 'Available ✅',
    image: 'Image/1st_pic.jpg'
  },
  {
    id: 'prop-2',
    name: 'Cozy Women Hostel',
    location: '13/A, South Khulshi, Road #02, Plot #06, Chittagong',
    rent: 5500,
    type: 'hostel',
    details: '1 Bed (Female) • 1 Bath',
    status: 'Available ✅',
    image: 'Image/2nd_pic.png'
  },
  {
    id: 'prop-3',
    name: 'Kulshi Office Suite',
    location: 'GEC, Kulshi, Chittagong',
    rent: 8000,
    type: 'office',
    details: '1 Room • Office Space',
    status: 'Available ✅',
    image: 'Image/3rd_pic.png'
  }
];

const bookings = [];

const sendPlain = (res, status, message, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'text/plain', ...headers });
  res.end(message);
};

const contentTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.json': 'application/json'
};

const baseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const sendJson = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...baseHeaders });
  res.end(JSON.stringify(payload));
};

const respondJson = (req, res, status, payload) => {
  sendJson(res, status, payload);
  logRequest(req, status);
};

const handleOptions = res => {
  res.writeHead(204, baseHeaders);
  res.end();
};

const parseBody = req => new Promise((resolve, reject) => {
  let data = '';
  req.on('data', chunk => { data += chunk; });
  req.on('end', () => {
    if (!data) return resolve({});
    try {
      resolve(JSON.parse(data));
    } catch (err) {
      reject(err);
    }
  });
  req.on('error', reject);
});

const logRequest = (req, statusCode) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.url} -> ${statusCode}`);
};

const filterProperties = query => {
  const searchLocation = (query.location || '').toLowerCase();
  const type = (query.type || '').toLowerCase();
  const minRent = query.minRent ? Number(query.minRent) : null;
  const maxRent = query.maxRent ? Number(query.maxRent) : null;

  return properties.filter(property => {
    const matchesLocation = searchLocation ? property.location.toLowerCase().includes(searchLocation) : true;
    const matchesType = type ? property.type === type : true;
    const matchesMin = minRent !== null ? property.rent >= minRent : true;
    const matchesMax = maxRent !== null ? property.rent <= maxRent : true;
    return matchesLocation && matchesType && matchesMin && matchesMax;
  });
};

const serveStatic = (req, res, pathname) => {
  const filePath = path.normalize(path.join(ROOT_DIR, pathname === '/' ? '/index.html' : pathname));
  if (!filePath.startsWith(ROOT_DIR)) {
    sendPlain(res, 403, 'Access denied');
    logRequest(req, 403);
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      sendPlain(res, 404, 'Not found');
      logRequest(req, 404);
      return;
    }

    const targetPath = stats.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    fs.readFile(targetPath, (readErr, data) => {
      if (readErr) {
        sendPlain(res, 500, 'Server error');
        logRequest(req, 500);
        return;
      }
      const ext = path.extname(targetPath);
      const contentType = contentTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
      logRequest(req, 200);
    });
  });
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname, searchParams } = url;

  if (req.method === 'OPTIONS') return handleOptions(res);

  if (pathname === '/api/health' && req.method === 'GET') {
    return respondJson(req, res, 200, { status: 'ok', timestamp: new Date().toISOString() });
  }

  if (pathname === '/api/properties' && req.method === 'GET') {
    const results = filterProperties(Object.fromEntries(searchParams.entries()));
    return respondJson(req, res, 200, { properties: results });
  }

  if (pathname === '/api/properties' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { name, location, rent, type, details = '', image = '' } = body;
      if (!name || !location || !rent || !type) {
        return respondJson(req, res, 400, { error: 'name, location, rent and type are required' });
      }
      const parsedRent = Number(rent);
      if (Number.isNaN(parsedRent) || parsedRent <= 0) {
        return respondJson(req, res, 400, { error: 'rent must be a positive number' });
      }
      const property = {
        id: `prop-${Date.now()}`,
        name: String(name).trim(),
        location: String(location).trim(),
        rent: parsedRent,
        type: String(type).toLowerCase(),
        details: String(details).trim(),
        status: 'Available ✅',
        image: image || 'Image/1st_pic.jpg'
      };
      properties = [property, ...properties];
      return respondJson(req, res, 201, { property, properties });
    } catch (err) {
      console.error('Property creation failed', err);
      return respondJson(req, res, 500, { error: 'Failed to create property' });
    }
  }

  if (pathname === '/api/bookings' && req.method === 'GET') {
    return respondJson(req, res, 200, { bookings });
  }

  if (pathname === '/api/bookings' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { name, phone, message = '', property = '' } = body;
      if (!name || !phone) return respondJson(req, res, 400, { error: 'name and phone are required' });
      const booking = {
        id: `booking-${Date.now()}`,
        name: String(name).trim(),
        phone: String(phone).trim(),
        message: String(message).trim(),
        property: String(property).trim()
      };
      bookings.push(booking);
      return respondJson(req, res, 201, { booking, message: 'Booking saved' });
    } catch (err) {
      console.error('Booking creation failed', err);
      return respondJson(req, res, 500, { error: 'Failed to save booking' });
    }
  }

  return serveStatic(req, res, pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`RentEase server running on http://${HOST}:${PORT}`);
});
