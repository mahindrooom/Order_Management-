const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFilePath = path.join(dataDir, 'db.json');

// Fixed Admin Emails (As specified: om.mahindroo@pluckk.co.in)
const ADMIN_EMAILS = [
  'om.mahindroo@pluckk.co.in',
  'admin@pluckk.co.in'
];

// Initial Pluckk SKU Master Catalog
const initialSkuMaster = [
  { sku_code: 'PLK-VEG-POT-01', item_name: 'Potato Agra Fresh (ज्योति आलू)', category: 'Vegetables', unit: 'kg', benchmark_rate: 22.50, mandi_spec: 'Grade A, 45mm+ size, dry skin', active: true },
  { sku_code: 'PLK-VEG-ONI-02', item_name: 'Onion Nashik Red (लाल प्याज)', category: 'Vegetables', unit: 'kg', benchmark_rate: 28.00, mandi_spec: 'Nashik origin, double patti, dry', active: true },
  { sku_code: 'PLK-VEG-TOM-03', item_name: 'Tomato Hybrid Grade-A (टमाटर)', category: 'Vegetables', unit: 'kg', benchmark_rate: 24.00, mandi_spec: 'Semi-ripe firm, red, 80-100g', active: true },
  { sku_code: 'PLK-VEG-CAP-04', item_name: 'Capsicum Green Shimla (हरी शिमला मिर्च)', category: 'Vegetables', unit: 'kg', benchmark_rate: 45.00, mandi_spec: 'Dark green, 3-4 lobes, unblemished', active: true },
  { sku_code: 'PLK-VEG-BHI-05', item_name: 'Bhindi / Okra Tender (भिंडी)', category: 'Vegetables', unit: 'kg', benchmark_rate: 38.00, mandi_spec: 'Tender 3-4 inch, snaps easily, no fibers', active: true },
  { sku_code: 'PLK-VEG-PAL-06', item_name: 'Palak Hydro / Desi Leafy (पालक)', category: 'Vegetables', unit: 'kg', benchmark_rate: 26.00, mandi_spec: 'Fresh green leaves, no yellowing, bunched', active: true },
  { sku_code: 'PLK-VEG-CAU-07', item_name: 'Cauliflower Medium (फूलगोभी)', category: 'Vegetables', unit: 'kg', benchmark_rate: 32.00, mandi_spec: 'Compact white curd, green jacket leaves', active: true },
  { sku_code: 'PLK-FRU-BAN-08', item_name: 'Robusta Banana Semi-Ripe (केला)', category: 'Fruits', unit: 'kg', benchmark_rate: 30.00, mandi_spec: 'Cavendish / Robusta, color stage 3.5 to 4', active: true },
  { sku_code: 'PLK-FRU-POM-09', item_name: 'Pomegranate Bhagwa Fresh (अनार)', category: 'Fruits', unit: 'kg', benchmark_rate: 110.00, mandi_spec: 'Bhagwa export grade, ruby red arils', active: true },
  { sku_code: 'PLK-VEG-COR-10', item_name: 'Coriander Fresh Leaves (धनिया पत्ती)', category: 'Vegetables', unit: 'kg', benchmark_rate: 40.00, mandi_spec: 'Fresh roots intact, aroma rich, green', active: true },
  { sku_code: 'PLK-VEG-GIN-11', item_name: 'Ginger Old Mature (अदरक)', category: 'Vegetables', unit: 'kg', benchmark_rate: 75.00, mandi_spec: 'Washed, low fiber, firm rhizomes', active: true },
  { sku_code: 'PLK-VEG-GAR-12', item_name: 'Garlic Desi Regular (लहसुन)', category: 'Vegetables', unit: 'kg', benchmark_rate: 140.00, mandi_spec: 'M.P. origin, dry cloves, tight skin', active: true }
];

// Initial Pre-configured Vendors with Catalogs & 4-Pillar Ratings
const initialVendors = [
  {
    id: 'v1',
    name: 'Ramesh Mandi Traders',
    email: 'ramesh.traders@gmail.com',
    phone: '+91 98201 11223',
    supplied_skus: ['PLK-VEG-POT-01', 'PLK-VEG-ONI-02', 'PLK-VEG-TOM-03'],
    ratings: {
      quality: 4.8,
      price: 4.9,
      fill_rate: 4.9,
      delivery_time: 4.8
    }
  },
  {
    id: 'v2',
    name: 'Suresh Greenfield Agro',
    email: 'suresh.agro@yahoo.com',
    phone: '+91 98202 22334',
    supplied_skus: ['PLK-VEG-POT-01', 'PLK-VEG-PAL-06', 'PLK-VEG-CAP-04', 'PLK-VEG-TOM-03'],
    ratings: {
      quality: 4.9,
      price: 4.5,
      fill_rate: 4.8,
      delivery_time: 4.9
    }
  },
  {
    id: 'v3',
    name: 'APMC Patil & Sons',
    email: 'patil.apmc@rediffmail.com',
    phone: '+91 98203 33445',
    supplied_skus: ['PLK-VEG-POT-01', 'PLK-VEG-ONI-02', 'PLK-VEG-BHI-05', 'PLK-VEG-CAU-07'],
    ratings: {
      quality: 4.6,
      price: 4.7,
      fill_rate: 4.6,
      delivery_time: 4.6
    }
  },
  {
    id: 'v4',
    name: 'Kisan Fresh Fruits Hub',
    email: 'kisan.fruits@outlook.com',
    phone: '+91 98204 44556',
    supplied_skus: ['PLK-FRU-BAN-08', 'PLK-FRU-POM-09'],
    ratings: {
      quality: 4.8,
      price: 4.6,
      fill_rate: 4.7,
      delivery_time: 4.8
    }
  }
];

// MongoDB Mongoose Schemas & Status Tracking
let isMongoConnected = false;
let mongoError = null;
const MONGODB_URI = process.env.MONGODB_URI;

const SkuSchema = new mongoose.Schema({
  sku_code: { type: String, required: true, unique: true },
  item_name: String,
  category: String,
  unit: String,
  benchmark_rate: Number,
  mandi_spec: String,
  active: { type: Boolean, default: true }
});

const VendorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  email: String,
  phone: String,
  supplied_skus: [String],
  ratings: {
    quality: { type: Number, default: 4.8 },
    price: { type: Number, default: 4.8 },
    fill_rate: { type: Number, default: 4.8 },
    delivery_time: { type: Number, default: 4.8 }
  }
});

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: String,
  role: String,
  isAdmin: Boolean,
  isSourcing: Boolean,
  vendorId: String,
  created_at: String
});

const IndentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: String,
  generated_at: String,
  status: String,
  unmatched_count: Number,
  items: Array
}, { timestamps: true });

const SubscriptionSchema = new mongoose.Schema({
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: String,
    auth: String
  },
  vendor_id: String,
  user_email: String,
  subscribed_at: String
});

const SkuModel = mongoose.models.SkuMaster || mongoose.model('SkuMaster', SkuSchema);
const VendorModel = mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);
const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
const IndentModel = mongoose.models.Indent || mongoose.model('Indent', IndentSchema);
const SubscriptionModel = mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);

async function initMongo() {
  if (!MONGODB_URI) {
    console.log('[DB] No MONGODB_URI configured. Running with local persistent JSON store.');
    return;
  }
  try {
    console.log('[DB] Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    isMongoConnected = true;
    console.log('[DB] Successfully connected to MongoDB Atlas!');

    // Seed collections if empty
    const skuCount = await SkuModel.countDocuments();
    if (skuCount === 0) {
      console.log('[DB] Seeding MongoDB with initial SKU Master Catalog...');
      await SkuModel.insertMany(initialSkuMaster);
    }
    const vendorCount = await VendorModel.countDocuments();
    if (vendorCount === 0) {
      console.log('[DB] Seeding MongoDB with initial Vendors...');
      await VendorModel.insertMany(initialVendors);
    }
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      console.log('[DB] Seeding MongoDB with default Users...');
      await UserModel.insertMany(defaultDb.users);
    }

    // Sync memory store from MongoDB
    const mongoSkus = await SkuModel.find({}).lean();
    const mongoVendors = await VendorModel.find({}).lean();
    const mongoUsers = await UserModel.find({}).lean();

    const current = readDb();
    if (mongoSkus.length) current.skuMaster = mongoSkus;
    if (mongoVendors.length) current.vendors = mongoVendors;
    if (mongoUsers.length) current.users = mongoUsers;
    writeDb(current);
  } catch (err) {
    mongoError = err.message;
    console.error('[DB] MongoDB Atlas connection error:', err.message);
    console.log('[DB] Running with local JSON store as fallback.');
  }
}

// Background async sync to MongoDB
function syncMongo(data) {
  if (!isMongoConnected) return;
  Promise.resolve().then(async () => {
    try {
      if (data.vendors && data.vendors.length) {
        for (const v of data.vendors) {
          await VendorModel.findOneAndUpdate({ id: v.id }, v, { upsert: true });
        }
      }
      if (data.skuMaster && data.skuMaster.length) {
        for (const s of data.skuMaster) {
          await SkuModel.findOneAndUpdate({ sku_code: s.sku_code }, s, { upsert: true });
        }
      }
      if (data.users && data.users.length) {
        for (const u of data.users) {
          await UserModel.findOneAndUpdate({ id: u.id }, u, { upsert: true });
        }
      }
      if (data.currentIndent && data.currentIndent.id) {
        await IndentModel.findOneAndUpdate({ id: data.currentIndent.id }, data.currentIndent, { upsert: true });
      }
      if (data.subscriptions && data.subscriptions.length) {
        for (const sub of data.subscriptions) {
          await SubscriptionModel.findOneAndUpdate({ endpoint: sub.endpoint }, sub, { upsert: true });
        }
      }
    } catch (err) {
      console.error('[DB] Async MongoDB sync error:', err.message);
    }
  });
}

// ================= INDENT & NOTIFICATION PERSISTENCE =================
function getSavedIndent() {
  const db = readDb();
  return db.currentIndent || null;
}

function saveIndent(indent) {
  if (!indent) return;
  const db = readDb();
  db.currentIndent = indent;
  writeDb(db);
}

function getSavedLogs() {
  const db = readDb();
  return Array.isArray(db.auditLogs) ? db.auditLogs : [];
}

function saveLogs(logs) {
  if (!Array.isArray(logs)) return;
  const db = readDb();
  db.auditLogs = logs.slice(-50);
  writeDb(db);
}

function getSubscriptions() {
  const db = readDb();
  return Array.isArray(db.subscriptions) ? db.subscriptions : [];
}

function saveSubscription(sub) {
  if (!sub || !sub.endpoint) return;
  const db = readDb();
  if (!Array.isArray(db.subscriptions)) db.subscriptions = [];
  const idx = db.subscriptions.findIndex(s => s.endpoint === sub.endpoint);
  if (idx >= 0) {
    db.subscriptions[idx] = sub;
  } else {
    db.subscriptions.push(sub);
  }
  writeDb(db);
}

function removeSubscription(endpoint) {
  if (!endpoint) return;
  const db = readDb();
  if (!Array.isArray(db.subscriptions)) return;
  db.subscriptions = db.subscriptions.filter(s => s.endpoint !== endpoint);
  writeDb(db);
}

function getDbStatus() {
  return {
    connected: isMongoConnected,
    type: isMongoConnected ? 'MongoDB Atlas' : 'Local File Store',
    uri_configured: Boolean(MONGODB_URI),
    error: mongoError
  };
}

function getCompositeRating(ratings) {
  if (!ratings) return 4.0;
  const q = parseFloat(ratings.quality || 4.0);
  const p = parseFloat(ratings.price || 4.0);
  const f = parseFloat(ratings.fill_rate || 4.0);
  const d = parseFloat(ratings.delivery_time || 4.0);
  return parseFloat(((q + p + f + d) / 4).toFixed(2));
}

const defaultDb = {
  skuMaster: initialSkuMaster,
  vendors: initialVendors,
  currentIndent: null,
  auditLogs: [],
  subscriptions: [],
  users: [
    {
      id: 'usr-admin-1',
      email: 'om.mahindroo@pluckk.co.in',
      name: 'Om Mahindroo',
      role: 'ADMIN',
      isAdmin: true,
      isSourcing: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'usr-sourcing-1',
      email: 'procurement@pluckk.in',
      name: 'Pluckk Sourcing Lead',
      role: 'SOURCING',
      isAdmin: false,
      isSourcing: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'usr-sourcing-2',
      email: 'ops@pluckk.co.in',
      name: 'Pluckk Sourcing Ops',
      role: 'SOURCING',
      isAdmin: false,
      isSourcing: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'usr-vendor-1',
      email: 'ramesh.traders@gmail.com',
      name: 'Ramesh Mandi Traders',
      role: 'VENDOR',
      isAdmin: false,
      isSourcing: false,
      vendorId: 'v1',
      created_at: new Date().toISOString()
    },
    {
      id: 'usr-vendor-2',
      email: 'suresh.agro@yahoo.com',
      name: 'Suresh Greenfield Agro',
      role: 'VENDOR',
      isAdmin: false,
      isSourcing: false,
      vendorId: 'v2',
      created_at: new Date().toISOString()
    }
  ]
};

function readDb() {
  try {
    if (fs.existsSync(dbFilePath)) {
      const data = fs.readFileSync(dbFilePath, 'utf8');
      const parsed = JSON.parse(data);
      let changed = false;
      if (!parsed.skuMaster || parsed.skuMaster.length === 0) {
        parsed.skuMaster = initialSkuMaster;
        changed = true;
      }
      if (!parsed.vendors || parsed.vendors.length === 0) {
        parsed.vendors = initialVendors;
        changed = true;
      }
      // Ensure om.mahindroo@pluckk.co.in is admin
      const omUser = (parsed.users || []).find(u => u.email.toLowerCase() === 'om.mahindroo@pluckk.co.in');
      if (omUser) {
        if (omUser.role !== 'ADMIN') {
          omUser.role = 'ADMIN';
          omUser.isAdmin = true;
          omUser.isSourcing = true;
          changed = true;
        }
      } else {
        parsed.users.unshift(defaultDb.users[0]);
        changed = true;
      }

      if (changed) {
        writeDb(parsed);
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error reading db.json:', err);
  }
  return defaultDb;
}

function writeDb(data) {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf8');
    syncMongo(data);
  } catch (err) {
    console.error('Error writing db.json:', err);
  }
}

// 3-Tier Role Evaluator
function evaluateRole(email) {
  if (!email || typeof email !== 'string') {
    return { role: 'VENDOR', isAdmin: false, isSourcing: false, normalizedEmail: '' };
  }
  const normalized = email.trim().toLowerCase();

  // 1. ADMIN: Fixed list (om.mahindroo@pluckk.co.in)
  if (ADMIN_EMAILS.includes(normalized)) {
    return {
      role: 'ADMIN',
      isAdmin: true,
      isSourcing: true,
      normalizedEmail: normalized
    };
  }

  // 2. SOURCING: Any @pluckk.co.in or @pluckk.in
  if (normalized.endsWith('@pluckk.co.in') || normalized.endsWith('@pluckk.in')) {
    return {
      role: 'SOURCING',
      isAdmin: false,
      isSourcing: true,
      normalizedEmail: normalized
    };
  }

  // 3. VENDOR: Everything else
  return {
    role: 'VENDOR',
    isAdmin: false,
    isSourcing: false,
    normalizedEmail: normalized
  };
}

// Helper: Match and enrich indent items against SKU Master Catalog
function matchAndEnrichItems(uploadedRows) {
  const db = readDb();
  const master = db.skuMaster || initialSkuMaster;

  const enriched = [];
  const unmatched = [];

  uploadedRows.forEach((row) => {
    const rawCode = (row.sku_code || '').trim().toUpperCase();
    const masterItem = master.find(m => m.sku_code.toUpperCase() === rawCode);

    const requiredQty = parseFloat(row.required_qty || 0);
    const targetRate = parseFloat(row.target_rate || (masterItem ? masterItem.benchmark_rate : 0));

    if (masterItem) {
      enriched.push({
        sku_code: masterItem.sku_code,
        item_name: row.item_name || masterItem.item_name,
        category: row.category || masterItem.category,
        unit: row.unit || masterItem.unit,
        required_qty: requiredQty,
        target_rate: targetRate,
        matched: true,
        mandi_spec: masterItem.mandi_spec
      });
    } else {
      const item = {
        sku_code: rawCode || 'UNKNOWN-SKU',
        item_name: row.item_name || `Article (${rawCode})`,
        category: row.category || 'General',
        unit: row.unit || 'kg',
        required_qty: requiredQty,
        target_rate: targetRate,
        matched: false,
        warning: 'SKU not found in Master Catalog'
      };
      enriched.push(item);
      unmatched.push(item);
    }
  });

  return { enriched, unmatched };
}

// ================= L1 LOWEST PRICE & TIE-BREAKER ALLOCATION ENGINE =================
/**
 * Greedy least-cost allocation:
 * 1. Sort active bids by quoted_rate ASCENDING.
 * 2. If quoted_rate is equal, tie-breaker: vendor composite rating DESCENDING
 *    (Pillars: Quality, Price competitiveness, Fill Rate, Time of Delivery).
 * 3. Allocate up to remaining_qty greedily.
 */
function recalculateL1Allocations(item, allVendors = []) {
  if (!item.bids) item.bids = [];

  const vendorsMap = {};
  allVendors.forEach(v => {
    vendorsMap[v.id] = {
      ...v,
      compositeRating: getCompositeRating(v.ratings)
    };
  });

  const activeBids = item.bids.filter(b => b.status === 'ACTIVE');

  // Sort: Lowest price first. Tie-breaker: Highest vendor rating
  activeBids.sort((a, b) => {
    if (a.quoted_rate !== b.quoted_rate) {
      return a.quoted_rate - b.quoted_rate; // Lowest rate wins
    }
    const ratingA = vendorsMap[a.vendor_id]?.compositeRating || 4.0;
    const ratingB = vendorsMap[b.vendor_id]?.compositeRating || 4.0;
    if (ratingA !== ratingB) {
      return ratingB - ratingA; // Higher rating wins
    }
    // Earlier timestamp tie-breaker
    return new Date(a.timestamp) - new Date(b.timestamp);
  });

  let remaining = item.required_qty;
  let totalAllocated = 0;
  let totalCost = 0;

  activeBids.forEach(bid => {
    const canAward = Math.min(bid.quantity, remaining);
    if (canAward > 0) {
      bid.allocated_qty = canAward;
      bid.allocation_status = (canAward === bid.quantity) ? 'AWARDED_FULL' : 'AWARDED_PARTIAL';
      remaining -= canAward;
      totalAllocated += canAward;
      totalCost += (canAward * bid.quoted_rate);
    } else {
      bid.allocated_qty = 0;
      bid.allocation_status = 'OUTBID';
    }
  });

  item.allocated_qty = totalAllocated;
  item.remaining_qty = Math.max(0, item.required_qty - totalAllocated);
  item.status = item.remaining_qty === 0 ? 'FULFILLED' : (totalAllocated > 0 ? 'PARTIALLY_FULFILLED' : 'OPEN');
  item.avg_procured_rate = totalAllocated > 0 ? parseFloat((totalCost / totalAllocated).toFixed(2)) : 0;

  // Sync item.allocations for PO generation and UI breakdown
  item.allocations = activeBids
    .filter(b => b.allocated_qty > 0)
    .map(b => ({
      id: b.id,
      vendor_id: b.vendor_id,
      vendor_name: b.vendor_name,
      quantity: b.allocated_qty,
      quoted_rate: b.quoted_rate,
      timestamp: b.timestamp,
      status: 'CONFIRMED'
    }));

  return item;
}

// Initialize db if not existing
if (!fs.existsSync(dbFilePath)) {
  writeDb(defaultDb);
}

module.exports = {
  readDb,
  writeDb,
  initMongo,
  getDbStatus,
  getSavedIndent,
  saveIndent,
  getSavedLogs,
  saveLogs,
  getSubscriptions,
  saveSubscription,
  removeSubscription,
  ADMIN_EMAILS,
  evaluateRole,
  initialSkuMaster,
  initialVendors,
  getCompositeRating,
  matchAndEnrichItems,
  recalculateL1Allocations
};
