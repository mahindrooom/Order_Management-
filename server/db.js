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
  ADMIN_EMAILS,
  evaluateRole,
  initialSkuMaster,
  initialVendors,
  getCompositeRating,
  matchAndEnrichItems,
  recalculateL1Allocations
};
