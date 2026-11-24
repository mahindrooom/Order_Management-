const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { 
  readDb, 
  writeDb, 
  initMongo,
  getDbStatus,
  evaluateRole, 
  matchAndEnrichItems, 
  recalculateL1Allocations,
  getCompositeRating,
  ADMIN_EMAILS
} = require('./db');

const app = express();
const server = http.createServer(app);

// Initialize DB (Connects to MongoDB Atlas if MONGODB_URI is provided, otherwise falls back to local JSON store)
initMongo().catch(err => console.error('[DB] Mongo init error:', err));
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Setup upload folder
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

// Load vendors from database
function getVendors() {
  const db = readDb();
  return db.vendors || [];
}

// Default sample items
const defaultSampleItems = [
  { sku_code: 'PLK-VEG-POT-01', item_name: 'Potato Agra Fresh (ज्योति आलू)', category: 'Vegetables', unit: 'kg', required_qty: 150, target_rate: 22.50 },
  { sku_code: 'PLK-VEG-ONI-02', item_name: 'Onion Nashik Red (लाल प्याज)', category: 'Vegetables', unit: 'kg', required_qty: 120, target_rate: 28.00 },
  { sku_code: 'PLK-VEG-TOM-03', item_name: 'Tomato Hybrid Grade-A (टमाटर)', category: 'Vegetables', unit: 'kg', required_qty: 100, target_rate: 24.00 },
  { sku_code: 'PLK-VEG-CAP-04', item_name: 'Capsicum Green Shimla (हरी शिमला मिर्च)', category: 'Vegetables', unit: 'kg', required_qty: 50, target_rate: 45.00 },
  { sku_code: 'PLK-VEG-BHI-05', item_name: 'Bhindi / Okra Tender (भिंडी)', category: 'Vegetables', unit: 'kg', required_qty: 60, target_rate: 38.00 },
  { sku_code: 'PLK-VEG-PAL-06', item_name: 'Palak Hydro / Desi Leafy (पालक)', category: 'Vegetables', unit: 'kg', required_qty: 40, target_rate: 26.00 },
  { sku_code: 'PLK-VEG-CAU-07', item_name: 'Cauliflower Medium (फूलगोभी)', category: 'Vegetables', unit: 'kg', required_qty: 75, target_rate: 32.00 },
  { sku_code: 'PLK-FRU-BAN-08', item_name: 'Robusta Banana Semi-Ripe (केला)', category: 'Fruits', unit: 'kg', required_qty: 90, target_rate: 30.00 },
  { sku_code: 'PLK-FRU-POM-09', item_name: 'Pomegranate Bhagwa Fresh (अनार)', category: 'Fruits', unit: 'kg', required_qty: 50, target_rate: 110.00 },
  { sku_code: 'PLK-VEG-COR-10', item_name: 'Coriander Fresh Leaves (धनिया पत्ती)', category: 'Vegetables', unit: 'kg', required_qty: 35, target_rate: 40.00 }
];

function createIndentFromItems(items, sourceTitle = 'Nightly Indent (12:30 AM)') {
  const { enriched, unmatched } = matchAndEnrichItems(items);
  return {
    id: 'IND-' + Date.now().toString().slice(-6),
    title: sourceTitle,
    generated_at: new Date().toISOString(),
    status: 'ACTIVE',
    unmatched_count: unmatched.length,
    items: enriched.map(item => ({
      sku_code: item.sku_code,
      item_name: item.item_name,
      category: item.category || 'General',
      unit: item.unit || 'kg',
      target_rate: parseFloat(item.target_rate || 0),
      required_qty: parseFloat(item.required_qty),
      allocated_qty: 0,
      remaining_qty: parseFloat(item.required_qty),
      avg_procured_rate: 0,
      status: 'OPEN', // 'OPEN', 'PARTIALLY_FULFILLED', 'FULFILLED'
      matched: item.matched !== false,
      mandi_spec: item.mandi_spec || null,
      warning: item.warning || null,
      bids: [], // [{ id, vendor_id, vendor_name, quoted_rate, quantity, allocated_qty, allocation_status, timestamp, status }]
      allocations: [] // Winning allocations
    }))
  };
}

let currentIndent = createIndentFromItems(defaultSampleItems);
let auditLogs = [
  {
    id: 'log-0',
    type: 'SYSTEM',
    title: 'Indent Distributed',
    message: 'Nightly Indent loaded with 10 SKUs. Requirements distributed to suppliers based on their supply catalogues.',
    timestamp: new Date().toISOString(),
    severity: 'info'
  }
];

function calculateSummary() {
  if (!currentIndent || !currentIndent.items) {
    return { total_skus: 0, total_demand_kg: 0, total_allocated_kg: 0, total_remaining_kg: 0, fill_rate_pct: 0, fulfilled_skus: 0, total_estimated_cost: 0 };
  }
  const total_skus = currentIndent.items.length;
  let total_demand_kg = 0;
  let total_allocated_kg = 0;
  let total_remaining_kg = 0;
  let fulfilled_skus = 0;
  let total_cost = 0;

  currentIndent.items.forEach(item => {
    total_demand_kg += item.required_qty;
    total_allocated_kg += item.allocated_qty;
    total_remaining_kg += item.remaining_qty;
    if (item.status === 'FULFILLED') {
      fulfilled_skus += 1;
    }
    (item.allocations || []).forEach(a => {
      total_cost += (a.quantity * (a.quoted_rate || item.target_rate));
    });
  });

  const fill_rate_pct = total_demand_kg > 0 
    ? Math.round((total_allocated_kg / total_demand_kg) * 100) 
    : 0;

  return {
    total_skus,
    total_demand_kg,
    total_allocated_kg,
    total_remaining_kg,
    fill_rate_pct,
    fulfilled_skus,
    total_estimated_cost: Math.round(total_cost)
  };
}

// ================= AUTHENTICATION APIS (3-Tier Access) =================
app.post('/api/auth/login', (req, res) => {
  const { email, name } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required' });
  }

  const { role, isAdmin, isSourcing, normalizedEmail } = evaluateRole(email);
  const db = readDb();

  let user = (db.users || []).find(u => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    const defaultName = name || (
      isAdmin ? 'Om Mahindroo (Admin)' :
      isSourcing ? `Pluckk Sourcing (${normalizedEmail.split('@')[0]})` :
      `${normalizedEmail.split('@')[0]} Mandi Supplier`
    );

    let vendorId = null;
    if (role === 'VENDOR') {
      let matchingVendor = (db.vendors || []).find(v => v.email && v.email.toLowerCase() === normalizedEmail);
      if (matchingVendor) {
        vendorId = matchingVendor.id;
      } else {
        vendorId = 'v-' + Date.now().toString().slice(-4);
        matchingVendor = {
          id: vendorId,
          name: defaultName,
          email: normalizedEmail,
          phone: '+91 98xxx xxxxx',
          supplied_skus: ['PLK-VEG-POT-01', 'PLK-VEG-ONI-02', 'PLK-VEG-TOM-03'], // Default supply root/staple
          ratings: {
            quality: 4.8,
            price: 4.7,
            fill_rate: 4.8,
            delivery_time: 4.7
          }
        };
        db.vendors.push(matchingVendor);
      }
    }

    user = {
      id: 'usr-' + Date.now(),
      email: normalizedEmail,
      name: defaultName,
      role,
      isAdmin,
      isSourcing,
      vendorId,
      created_at: new Date().toISOString()
    };

    db.users.push(user);
    writeDb(db);
  } else {
    // Ensure roles are in sync with current definition
    user.role = role;
    user.isAdmin = isAdmin;
    user.isSourcing = isSourcing;
    writeDb(db);
  }

  const token = 'plk_token_' + Buffer.from(JSON.stringify({ id: user.id, email: user.email, role: user.role })).toString('base64');

  res.json({
    success: true,
    user,
    token,
    message: isAdmin 
      ? 'Welcome to Pluckk Admin Console (Full Control)' 
      : isSourcing 
      ? 'Welcome to Pluckk Sourcing Operations'
      : 'Welcome to Pluckk Supplier Portal (1-to-1 Mode)'
  });
});

app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const tokenStr = authHeader.split(' ')[1];
  try {
    const raw = tokenStr.replace('plk_token_', '');
    const decoded = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    const db = readDb();
    const user = (db.users || []).find(u => u.id === decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    return res.json({ user });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// ================= VENDOR & CATALOG APIS =================
app.get('/api/db-status', (req, res) => {
  res.json(getDbStatus());
});

app.get('/api/vendors', (req, res) => {
  const vendors = getVendors().map(v => ({
    ...v,
    compositeRating: getCompositeRating(v.ratings)
  }));
  res.json(vendors);
});

// Add / Onboard a new vendor (Admin & Sourcing)
app.post('/api/vendors', (req, res) => {
  const { name, email, phone, supplied_skus, ratings } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Vendor name and email are required' });
  }

  const db = readDb();
  if (!db.vendors) db.vendors = [];

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.vendors.find(v => v.email && v.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return res.status(400).json({ error: 'A vendor with this email already exists' });
  }

  const newVendor = {
    id: 'v-' + Date.now().toString().slice(-4),
    name: name.trim(),
    email: normalizedEmail,
    phone: phone ? phone.trim() : '+91 98xxx xxxxx',
    supplied_skus: Array.isArray(supplied_skus) ? supplied_skus : ['PLK-VEG-POT-01', 'PLK-VEG-ONI-02', 'PLK-VEG-TOM-03'],
    ratings: ratings || { quality: 4.8, price: 4.8, fill_rate: 4.8, delivery_time: 4.8 }
  };

  db.vendors.push(newVendor);
  writeDb(db);

  const enriched = {
    ...newVendor,
    compositeRating: getCompositeRating(newVendor.ratings)
  };

  io.emit('vendor:added', { vendor: enriched });

  res.json({ success: true, vendor: enriched });
});

// Update a vendor's supply catalogue (What they supply)
app.post('/api/vendors/:id/catalog', (req, res) => {
  const vendorId = req.params.id;
  const { supplied_skus, email, name } = req.body;

  if (!Array.isArray(supplied_skus)) {
    return res.status(400).json({ error: 'supplied_skus must be an array of SKU codes' });
  }

  const db = readDb();
  if (!db.vendors) db.vendors = [];

  let vendor = db.vendors.find(v => 
    v.id === vendorId || 
    (email && v.email && v.email.toLowerCase() === email.toLowerCase())
  );

  if (!vendor) {
    const effectiveId = (vendorId && vendorId !== 'null' && vendorId !== 'undefined') 
      ? vendorId 
      : ('v-' + Date.now().toString().slice(-4));

    vendor = {
      id: effectiveId,
      name: name || 'Supplier',
      email: email || '',
      phone: '+91 98xxx xxxxx',
      supplied_skus: supplied_skus,
      ratings: { quality: 4.8, price: 4.8, fill_rate: 4.8, delivery_time: 4.8 }
    };
    db.vendors.push(vendor);
  } else {
    vendor.supplied_skus = supplied_skus;
  }

  writeDb(db);

  const enrichedVendor = {
    ...vendor,
    compositeRating: getCompositeRating(vendor.ratings)
  };

  io.emit('vendor:catalog_updated', {
    vendor_id: vendor.id,
    vendor_name: vendor.name,
    supplied_skus: vendor.supplied_skus,
    vendor: enrichedVendor
  });

  res.json({ success: true, vendor: enrichedVendor });
});

// Update a vendor's 4 rating pillars (Admin only)
app.post('/api/vendors/:id/ratings', (req, res) => {
  const vendorId = req.params.id;
  const { quality, price, fill_rate, delivery_time } = req.body;

  const db = readDb();
  const vendor = (db.vendors || []).find(v => v.id === vendorId);
  if (!vendor) {
    return res.status(404).json({ error: 'Vendor not found' });
  }

  vendor.ratings = {
    quality: parseFloat(quality || vendor.ratings?.quality || 4.0),
    price: parseFloat(price || vendor.ratings?.price || 4.0),
    fill_rate: parseFloat(fill_rate || vendor.ratings?.fill_rate || 4.0),
    delivery_time: parseFloat(delivery_time || vendor.ratings?.delivery_time || 4.0)
  };
  writeDb(db);

  res.json({ success: true, vendor, compositeRating: getCompositeRating(vendor.ratings) });
});

// ================= SKU MASTER APIS =================
app.get('/api/sku-master', (req, res) => {
  const db = readDb();
  res.json(db.skuMaster || []);
});

app.post('/api/sku-master', (req, res) => {
  const { sku_code, item_name, category, unit, benchmark_rate, mandi_spec } = req.body;
  if (!sku_code || !item_name) {
    return res.status(400).json({ error: 'sku_code and item_name are required' });
  }

  const db = readDb();
  if (!db.skuMaster) db.skuMaster = [];

  const existingIdx = db.skuMaster.findIndex(s => s.sku_code.toUpperCase() === sku_code.trim().toUpperCase());
  const entry = {
    sku_code: sku_code.trim().toUpperCase(),
    item_name: item_name.trim(),
    category: category || 'Vegetables',
    unit: unit || 'kg',
    benchmark_rate: parseFloat(benchmark_rate || 0),
    mandi_spec: mandi_spec || '',
    active: true
  };

  if (existingIdx >= 0) {
    db.skuMaster[existingIdx] = entry;
  } else {
    db.skuMaster.push(entry);
  }

  writeDb(db);
  res.json({ success: true, item: entry, total: db.skuMaster.length });
});

// ================= INDENT & STATE APIS =================
app.get('/api/state', (req, res) => {
  const vendors = getVendors().map(v => ({
    ...v,
    compositeRating: getCompositeRating(v.ratings)
  }));

  res.json({
    indent: currentIndent,
    vendors,
    summary: calculateSummary(),
    logs: auditLogs.slice(-50)
  });
});

app.post('/api/reset', (req, res) => {
  currentIndent = createIndentFromItems(defaultSampleItems, 'Default 12:30 AM Indent (Reset)');
  const log = {
    id: 'log-' + Date.now(),
    type: 'RESET',
    title: 'Indent Reset',
    message: 'System reloaded fresh 12:30 AM sample indent. All quotations cleared.',
    timestamp: new Date().toISOString(),
    severity: 'info'
  };
  auditLogs.push(log);

  io.emit('state:updated', {
    indent: currentIndent,
    summary: calculateSummary(),
    log
  });

  res.json({ success: true, indent: currentIndent });
});

app.post('/api/upload-indent', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const isJson = req.file.originalname.endsWith('.json');

  if (isJson) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : (parsed.items || []);
      currentIndent = createIndentFromItems(items, `Upload: ${req.file.originalname}`);
      fs.unlinkSync(filePath);

      const log = {
        id: 'log-' + Date.now(),
        type: 'UPLOAD',
        title: 'New Indent Uploaded (JSON)',
        message: `Parsed ${currentIndent.items.length} SKUs. Requirements routed based on supplier catalogues.`,
        timestamp: new Date().toISOString(),
        severity: 'info'
      };
      auditLogs.push(log);

      io.emit('state:updated', {
        indent: currentIndent,
        summary: calculateSummary(),
        log
      });

      return res.json({ success: true, count: currentIndent.items.length });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to parse JSON file: ' + err.message });
    }
  }

  // Parse CSV
  const items = [];
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      if (row.sku_code || row.item_name) {
        items.push({
          sku_code: row.sku_code || `SKU-${items.length + 1}`,
          item_name: row.item_name || '',
          category: row.category || '',
          unit: row.unit || '',
          required_qty: parseFloat(row.required_qty || 0),
          target_rate: parseFloat(row.target_rate || 0)
        });
      }
    })
    .on('end', () => {
      fs.unlinkSync(filePath);
      if (items.length === 0) {
        return res.status(400).json({ error: 'No valid rows found in CSV' });
      }

      currentIndent = createIndentFromItems(items, `Upload: ${req.file.originalname}`);
      const log = {
        id: 'log-' + Date.now(),
        type: 'UPLOAD',
        title: 'New Indent Uploaded (CSV)',
        message: `Uploaded ${items.length} SKUs. Requirements segregated and dispatched to suppliers according to catalogue.`,
        timestamp: new Date().toISOString(),
        severity: 'info'
      };
      auditLogs.push(log);

      io.emit('state:updated', {
        indent: currentIndent,
        summary: calculateSummary(),
        log
      });

      res.json({ success: true, count: items.length });
    })
    .on('error', (err) => {
      res.status(500).json({ error: 'CSV parse error: ' + err.message });
    });
});

app.get('/api/export-po', (req, res) => {
  const rows = [];
  rows.push(['SKU Code', 'Article Name', 'Category', 'Unit', 'Target Rate (Rs)', 'Procured Avg Rate (Rs)', 'Required Qty', 'Fulfilled Qty', 'Awarded Suppliers (Rate & Qty)', 'Status']);

  currentIndent.items.forEach(item => {
    const vendorSummary = (item.allocations || [])
      .map(a => `${a.vendor_name}: ${a.quantity}${item.unit} @ Rs.${a.quoted_rate}`)
      .join(' | ') || 'None';

    rows.push([
      `"${item.sku_code}"`,
      `"${item.item_name}"`,
      `"${item.category}"`,
      `"${item.unit}"`,
      item.target_rate,
      item.avg_procured_rate || item.target_rate,
      item.required_qty,
      item.allocated_qty,
      `"${vendorSummary}"`,
      item.status
    ]);
  });

  const csvContent = rows.map(r => r.join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="pluckk-po-' + Date.now() + '.csv"');
  res.send(csvContent);
});

// ================= SOCKET.IO REAL-TIME BIDDING & ALLOCATION ENGINE =================
io.on('connection', (socket) => {
  socket.on('get:state', () => {
    const vendors = getVendors().map(v => ({
      ...v,
      compositeRating: getCompositeRating(v.ratings)
    }));

    socket.emit('state:init', {
      indent: currentIndent,
      vendors,
      summary: calculateSummary(),
      logs: auditLogs.slice(-50)
    });
  });

  // 1. Vendor Submits a Quote / Price & Quantity Bid
  socket.on('vendor:submit_bid', (payload) => {
    const { vendor_id, vendor_name, sku_code, quantity, quoted_rate } = payload;
    const qty = parseFloat(quantity);
    const rate = parseFloat(quoted_rate);

    if (!qty || qty <= 0 || !rate || rate <= 0) {
      return socket.emit('error:response', { message: 'Please enter valid quantity and price per kg' });
    }

    const item = currentIndent.items.find(i => i.sku_code === sku_code);
    if (!item) {
      return socket.emit('error:response', { message: 'SKU not found in active indent' });
    }

    if (!item.bids) item.bids = [];

    // Find existing bid from this vendor for this SKU
    let existingBid = item.bids.find(b => b.vendor_id === vendor_id);
    if (existingBid) {
      existingBid.quantity = qty;
      existingBid.quoted_rate = rate;
      existingBid.timestamp = new Date().toISOString();
      existingBid.status = 'ACTIVE';
    } else {
      existingBid = {
        id: 'bid-' + vendor_id + '-' + Date.now(),
        vendor_id,
        vendor_name,
        quantity: qty,
        quoted_rate: rate,
        timestamp: new Date().toISOString(),
        status: 'ACTIVE'
      };
      item.bids.push(existingBid);
    }

    // Re-run Lowest Price (L1) Greedy Allocation with Rating Tie-Breaker
    const allVendors = getVendors();
    recalculateL1Allocations(item, allVendors);

    const isFullNow = item.remaining_qty === 0;
    const isAwarded = existingBid.allocated_qty > 0;

    const log = {
      id: 'log-' + Date.now(),
      type: isAwarded ? 'BID_AWARDED' : 'BID_OUTBID',
      title: isAwarded 
        ? `🟢 L1 Allocation: ${item.item_name}` 
        : `⚠️ Outbid Notice: ${item.item_name}`,
      message: isAwarded
        ? `${vendor_name} quoted ₹${rate}/${item.unit} for ${qty} ${item.unit}. Awarded: ${existingBid.allocated_qty} ${item.unit}! (Remaining demand: ${item.remaining_qty} ${item.unit}).`
        : `${vendor_name} quoted ₹${rate}/${item.unit}. Currently outbid by lower-rate suppliers.`,
      timestamp: new Date().toISOString(),
      severity: isAwarded ? (isFullNow ? 'success' : 'info') : 'warning',
      sku_code: item.sku_code
    };
    auditLogs.push(log);

    io.emit('sku:updated', {
      sku: item,
      summary: calculateSummary(),
      log,
      vendor_action: {
        vendor_id,
        vendor_name,
        action: 'BID',
        quoted_rate: rate,
        allocated_qty: existingBid.allocated_qty,
        allocation_status: existingBid.allocation_status
      }
    });
  });

  // 2. Vendor Shortfall / Backout (Anytime)
  socket.on('vendor:backout', (payload) => {
    const { vendor_id, vendor_name, sku_code, reason, drop_qty } = payload;
    const item = currentIndent.items.find(i => i.sku_code === sku_code);
    if (!item) return;

    const bid = (item.bids || []).find(b => b.vendor_id === vendor_id && b.status === 'ACTIVE');
    if (!bid) {
      return socket.emit('error:response', { message: 'No active bid found for this supplier' });
    }

    const previousAllocated = bid.allocated_qty || 0;
    const requestedDrop = drop_qty ? parseFloat(drop_qty) : bid.quantity;
    const actualDrop = Math.min(requestedDrop, bid.quantity);

    if (actualDrop === bid.quantity) {
      bid.status = 'BACKED_OUT';
      bid.backed_out_reason = reason || 'Stock shortage reported';
      bid.allocated_qty = 0;
    } else {
      bid.quantity -= actualDrop;
    }

    // Re-run L1 engine to re-award to next best vendor or open pool!
    const allVendors = getVendors();
    recalculateL1Allocations(item, allVendors);

    const log = {
      id: 'log-' + Date.now(),
      type: 'SHORTFALL_ALERT',
      title: `🚨 SHORTFALL ALERT: ${item.item_name} (${actualDrop} ${item.unit} Released)`,
      message: `${vendor_name} reported shortfall of ${actualDrop} ${item.unit}! (Reason: ${reason || 'Supply shortage'}). System automatically re-evaluated lowest cost bids. Remaining open: ${item.remaining_qty} ${item.unit}.`,
      timestamp: new Date().toISOString(),
      severity: 'critical',
      sku_code: item.sku_code,
      emergency: true
    };
    auditLogs.push(log);

    io.emit('sku:updated', {
      sku: item,
      summary: calculateSummary(),
      log,
      emergency: true,
      vendor_action: {
        vendor_id,
        vendor_name,
        action: 'BACKOUT',
        released_qty: actualDrop
      }
    });
  });

  // 3. Admin/Sourcing SOS broadcast
  socket.on('admin:broadcast_sos', (payload) => {
    const { sku_code } = payload;
    const item = currentIndent.items.find(i => i.sku_code === sku_code);
    if (!item) return;

    const log = {
      id: 'log-' + Date.now(),
      type: 'SOS_BROADCAST',
      title: `📢 URGENT SOS: ${item.item_name}`,
      message: `Priority Mandi Alert sent to eligible suppliers: Need ${item.remaining_qty} ${item.unit} urgently at Target Rate ₹${item.target_rate}/${item.unit}! Submit best quote now.`,
      timestamp: new Date().toISOString(),
      severity: 'warning',
      sku_code: item.sku_code
    };
    auditLogs.push(log);

    io.emit('notification:sos', {
      sku_code: item.sku_code,
      item_name: item.item_name,
      remaining_qty: item.remaining_qty,
      unit: item.unit,
      target_rate: item.target_rate,
      log
    });
  });
});

// Serve built client static files if available
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Pluckk Procurement & L1 Allocation Engine running on http://localhost:${PORT}`);
});
