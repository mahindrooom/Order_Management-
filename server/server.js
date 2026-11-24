const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { readDb, writeDb, matchAndEnrichItems } = require('./db');

const app = express();
const server = http.createServer(app);
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

// Initial Pre-configured Vendors
let vendorsList = [
  { id: 'v1', name: 'Ramesh Mandi Traders', email: 'ramesh.traders@gmail.com', phone: '+91 98201 11223', rating: 4.8, tags: ['Root Veg', 'Potato', 'Onion'] },
  { id: 'v2', name: 'Suresh Greenfield Agro', email: 'suresh.agro@yahoo.com', phone: '+91 98202 22334', rating: 4.9, tags: ['Leafy', 'Tomato', 'Capsicum'] },
  { id: 'v3', name: 'APMC Patil & Sons', email: 'patil.apmc@rediffmail.com', phone: '+91 98203 33445', rating: 4.6, tags: ['General Veg', 'Cauliflower', 'Bhindi'] },
  { id: 'v4', name: 'Kisan Fresh Fruits Hub', email: 'kisan.fruits@outlook.com', phone: '+91 98204 44556', rating: 4.7, tags: ['Fruits', 'Pomegranate', 'Banana'] }
];

// Default sample indent items
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
      status: 'OPEN', // 'OPEN', 'PARTIALLY_FULFILLED', 'FULFILLED'
      matched: item.matched !== false,
      mandi_spec: item.mandi_spec || null,
      warning: item.warning || null,
      allocations: [] // [{ id, vendor_id, vendor_name, quantity, timestamp, status: 'CONFIRMED'|'BACKED_OUT' }]
    }))
  };
}

// In-Memory state
let currentIndent = createIndentFromItems(defaultSampleItems);
let auditLogs = [
  {
    id: 'log-0',
    type: 'SYSTEM',
    title: 'Indent Loaded',
    message: 'Nightly Indent generated with 10 SKUs (Total 770 kg). Live requirement open for suppliers.',
    timestamp: new Date().toISOString(),
    severity: 'info'
  }
];

// Helper to recalculate summary
function calculateSummary() {
  if (!currentIndent || !currentIndent.items) {
    return { total_skus: 0, total_demand_kg: 0, total_allocated_kg: 0, total_remaining_kg: 0, fill_rate_pct: 0, fulfilled_skus: 0 };
  }
  const total_skus = currentIndent.items.length;
  let total_demand_kg = 0;
  let total_allocated_kg = 0;
  let total_remaining_kg = 0;
  let fulfilled_skus = 0;

  currentIndent.items.forEach(item => {
    total_demand_kg += item.required_qty;
    total_allocated_kg += item.allocated_qty;
    total_remaining_kg += item.remaining_qty;
    if (item.status === 'FULFILLED') {
      fulfilled_skus += 1;
    }
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
    fulfilled_skus
  };
}

// ================= AUTHENTICATION APIS =================

/**
 * Authentication Rule:
 * Email ending in @pluckk.co.in or @pluckk.in => ADMIN ACCESS
 * Any other email => RESTRICTED ACCESS (Vendor / Supplier Portal)
 */
function evaluateRole(email) {
  if (!email || typeof email !== 'string') {
    return { isAdmin: false, role: 'VENDOR' };
  }
  const normalized = email.trim().toLowerCase();
  const isAdmin = normalized.endsWith('@pluckk.co.in') || normalized.endsWith('@pluckk.in');
  return {
    isAdmin,
    role: isAdmin ? 'ADMIN' : 'VENDOR',
    normalizedEmail: normalized
  };
}

app.post('/api/auth/login', (req, res) => {
  const { email, name } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required' });
  }

  const { isAdmin, role, normalizedEmail } = evaluateRole(email);
  const db = readDb();

  let user = (db.users || []).find(u => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    // Auto register user
    const defaultName = name || (
      isAdmin 
        ? `Pluckk Official (${normalizedEmail.split('@')[0]})` 
        : `${normalizedEmail.split('@')[0]} Supplier`
    );

    // If vendor, see if an existing pre-configured vendor has this email
    let matchingVendor = vendorsList.find(v => v.email && v.email.toLowerCase() === normalizedEmail);
    let vendorId = null;

    if (!isAdmin) {
      if (matchingVendor) {
        vendorId = matchingVendor.id;
      } else {
        vendorId = 'v-' + Date.now().toString().slice(-4);
        matchingVendor = {
          id: vendorId,
          name: defaultName,
          email: normalizedEmail,
          phone: '+91 98xxx xxxxx',
          rating: 5.0,
          tags: ['Fresh Produce']
        };
        vendorsList.push(matchingVendor);
      }
    }

    user = {
      id: 'usr-' + Date.now(),
      email: normalizedEmail,
      name: defaultName,
      role,
      isAdmin,
      vendorId,
      created_at: new Date().toISOString()
    };

    db.users.push(user);
    writeDb(db);
  } else {
    // If existing vendor, ensure vendorId is linked
    if (!isAdmin && !user.vendorId) {
      let matchingVendor = vendorsList.find(v => v.email && v.email.toLowerCase() === normalizedEmail);
      if (!matchingVendor) {
        user.vendorId = 'v-' + Date.now().toString().slice(-4);
        vendorsList.push({
          id: user.vendorId,
          name: user.name,
          email: normalizedEmail,
          phone: '+91 98xxx xxxxx',
          rating: 5.0,
          tags: ['Fresh Produce']
        });
      } else {
        user.vendorId = matchingVendor.id;
      }
      writeDb(db);
    }
  }

  const token = 'plk_token_' + Buffer.from(JSON.stringify({ id: user.id, email: user.email, role: user.role })).toString('base64');

  res.json({
    success: true,
    user,
    token,
    message: isAdmin 
      ? 'Welcome to Pluckk Procurement Command Center (Admin Access)' 
      : 'Welcome to Pluckk Supplier Portal (Restricted 1-to-1 Access)'
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

// ================= STATE & DATA APIS =================

app.get('/api/state', (req, res) => {
  res.json({
    indent: currentIndent,
    vendors: vendorsList,
    summary: calculateSummary(),
    logs: auditLogs.slice(-50)
  });
});

app.get('/api/vendors', (req, res) => {
  res.json(vendorsList);
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

// Reset or load default indent
app.post('/api/reset', (req, res) => {
  currentIndent = createIndentFromItems(defaultSampleItems, 'Default 12:30 AM Indent (Reset)');
  const log = {
    id: 'log-' + Date.now(),
    type: 'RESET',
    title: 'Indent Reset',
    message: 'System reloaded fresh 12:30 AM sample indent. All allocations cleared.',
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

// Upload CSV / JSON indent
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
        message: `Parsed ${currentIndent.items.length} SKUs from ${req.file.originalname}. Broadcasting to suppliers.`,
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
          item_name: row.item_name || 'Unnamed Article',
          category: row.category || 'Vegetables',
          unit: row.unit || 'kg',
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
        message: `Uploaded ${items.length} SKUs from ${req.file.originalname}. Live requirements broadcasted.`,
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

// Export Purchase Order (PO) format
app.get('/api/export-po', (req, res) => {
  const rows = [];
  rows.push(['SKU Code', 'Article Name', 'Category', 'Unit', 'Target Rate', 'Required Qty', 'Fulfilled Qty', 'Vendor Confirmations', 'Status']);

  currentIndent.items.forEach(item => {
    const vendorSummary = item.allocations
      .filter(a => a.status === 'CONFIRMED')
      .map(a => `${a.vendor_name}: ${a.quantity} ${item.unit}`)
      .join(' | ') || 'None';

    rows.push([
      `"${item.sku_code}"`,
      `"${item.item_name}"`,
      `"${item.category}"`,
      `"${item.unit}"`,
      item.target_rate,
      item.required_qty,
      item.allocated_qty,
      `"${vendorSummary}"`,
      item.status
    ]);
  });

  const csvContent = rows.map(r => r.join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="pluckk-morning-po-' + Date.now() + '.csv"');
  res.send(csvContent);
});

// Socket.IO Real-Time Engine
io.on('connection', (socket) => {
  socket.on('get:state', () => {
    socket.emit('state:init', {
      indent: currentIndent,
      vendors: vendorsList,
      summary: calculateSummary(),
      logs: auditLogs.slice(-50)
    });
  });

  // 1. Vendor Confirms / Claims Quantity
  socket.on('vendor:confirm', (payload) => {
    const { vendor_id, vendor_name, sku_code, quantity } = payload;
    const qty = parseFloat(quantity);

    if (!qty || qty <= 0) {
      return socket.emit('error:response', { message: 'Invalid quantity' });
    }

    const item = currentIndent.items.find(i => i.sku_code === sku_code);
    if (!item) {
      return socket.emit('error:response', { message: 'SKU not found' });
    }

    if (item.remaining_qty <= 0) {
      return socket.emit('error:response', { 
        message: `Sorry! ${item.item_name} has already been fulfilled by another supplier. Stock requirement closed.` 
      });
    }

    // Race-condition clamp
    const actualAllocated = Math.min(qty, item.remaining_qty);
    item.allocated_qty += actualAllocated;
    item.remaining_qty = Math.max(0, item.required_qty - item.allocated_qty);

    const isFullNow = item.remaining_qty === 0;
    item.status = isFullNow ? 'FULFILLED' : 'PARTIALLY_FULFILLED';

    const allocationId = 'alloc-' + Date.now();
    const newAllocation = {
      id: allocationId,
      vendor_id,
      vendor_name,
      quantity: actualAllocated,
      requested_quantity: qty,
      timestamp: new Date().toISOString(),
      status: 'CONFIRMED'
    };
    item.allocations.push(newAllocation);

    // Audit Log
    const log = {
      id: 'log-' + Date.now(),
      type: isFullNow ? 'FULFILLED' : 'PARTIAL',
      title: isFullNow ? `✅ SKU Closed: ${item.item_name}` : `⚠️ Partial Claim: ${item.item_name}`,
      message: isFullNow
        ? `${vendor_name} confirmed ${actualAllocated} ${item.unit}. Requirement 100% complete! Other vendors notified that stock is locked.`
        : `${vendor_name} confirmed ${actualAllocated} ${item.unit}. ${item.remaining_qty} ${item.unit} still required! Real-time alerts pushed to remaining vendors.`,
      timestamp: new Date().toISOString(),
      severity: isFullNow ? 'success' : 'warning',
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
        action: 'CONFIRM',
        allocated: actualAllocated
      }
    });
  });

  // 2. The 5:00 AM Twist: Vendor Backs Out or Drops Stock
  socket.on('vendor:backout', (payload) => {
    const { vendor_id, vendor_name, sku_code, reason, drop_qty } = payload;
    const item = currentIndent.items.find(i => i.sku_code === sku_code);
    if (!item) return;

    const alloc = item.allocations.find(a => a.vendor_id === vendor_id && a.status === 'CONFIRMED');
    if (!alloc) {
      return socket.emit('error:response', { message: 'No active confirmation found for this vendor' });
    }

    const releasedQty = drop_qty ? Math.min(parseFloat(drop_qty), alloc.quantity) : alloc.quantity;

    if (releasedQty === alloc.quantity) {
      alloc.status = 'BACKED_OUT';
      alloc.backed_out_reason = reason || 'Unable to supply at 5 AM mandi';
    } else {
      alloc.quantity -= releasedQty;
    }

    // Return stock to remaining pool!
    item.allocated_qty = Math.max(0, item.allocated_qty - releasedQty);
    item.remaining_qty = item.required_qty - item.allocated_qty;
    item.status = item.allocated_qty === 0 ? 'OPEN' : 'PARTIALLY_FULFILLED';

    const log = {
      id: 'log-' + Date.now(),
      type: 'SHORTFALL_ALERT',
      title: `🚨 5:00 AM SHORTFALL ALERT: ${item.item_name}`,
      message: `${vendor_name} reported stock dropout of ${releasedQty} ${item.unit}! (Reason: ${reason || 'Mandi shortage'}). System automatically reopened ${item.remaining_qty} ${item.unit} to all other suppliers.`,
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
        released_qty: releasedQty
      }
    });
  });

  // 3. Admin Emergency Action: Broadcast SOS for Shortfall
  socket.on('admin:broadcast_sos', (payload) => {
    const { sku_code } = payload;
    const item = currentIndent.items.find(i => i.sku_code === sku_code);
    if (!item) return;

    const log = {
      id: 'log-' + Date.now(),
      type: 'SOS_BROADCAST',
      title: `📢 PLUCKK URGENT SOS: ${item.item_name}`,
      message: `Priority Mandi Alert sent to all suppliers: Need ${item.remaining_qty} ${item.unit} urgently! First supplier to confirm will be awarded order.`,
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
  console.log(`Pluckk Order Management Real-Time Engine running on http://localhost:${PORT}`);
});
