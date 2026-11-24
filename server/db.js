const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFilePath = path.join(dataDir, 'db.json');

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

const defaultDb = {
  skuMaster: initialSkuMaster,
  users: [
    {
      id: 'usr-admin-1',
      email: 'procurement@pluckk.in',
      name: 'Pluckk Procurement Lead',
      role: 'ADMIN',
      isAdmin: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'usr-admin-2',
      email: 'ops@pluckk.co.in',
      name: 'Pluckk Operations Official',
      role: 'ADMIN',
      isAdmin: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'usr-vendor-1',
      email: 'ramesh.traders@gmail.com',
      name: 'Ramesh Mandi Traders',
      role: 'VENDOR',
      isAdmin: false,
      vendorId: 'v1',
      created_at: new Date().toISOString()
    },
    {
      id: 'usr-vendor-2',
      email: 'suresh.agro@yahoo.com',
      name: 'Suresh Greenfield Agro',
      role: 'VENDOR',
      isAdmin: false,
      vendorId: 'v2',
      created_at: new Date().toISOString()
    }
  ]
};

// Mongoose Schema (for MongoDB Atlas connection when MONGODB_URI is provided)
let isMongoConnected = false;
let MongoSkuMaster = null;
let MongoUser = null;

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB Atlas successfully!');
      isMongoConnected = true;
    })
    .catch((err) => {
      console.error('MongoDB Atlas connection error, falling back to local persistent store:', err.message);
    });

  const SkuSchema = new mongoose.Schema({
    sku_code: { type: String, required: true, unique: true },
    item_name: String,
    category: String,
    unit: String,
    benchmark_rate: Number,
    mandi_spec: String,
    active: { type: Boolean, default: true }
  });
  MongoSkuMaster = mongoose.models.SkuMaster || mongoose.model('SkuMaster', SkuSchema);

  const UserSchema = new mongoose.Schema({
    id: String,
    email: { type: String, unique: true },
    name: String,
    role: String,
    isAdmin: Boolean,
    vendorId: String,
    created_at: String
  });
  MongoUser = mongoose.models.User || mongoose.model('User', UserSchema);
}

function readDb() {
  try {
    if (fs.existsSync(dbFilePath)) {
      const data = fs.readFileSync(dbFilePath, 'utf8');
      const parsed = JSON.parse(data);
      if (!parsed.skuMaster || parsed.skuMaster.length === 0) {
        parsed.skuMaster = initialSkuMaster;
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
      // Unmatched SKU
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

// Initialize db if not existing
if (!fs.existsSync(dbFilePath)) {
  writeDb(defaultDb);
}

module.exports = {
  readDb,
  writeDb,
  initialSkuMaster,
  matchAndEnrichItems,
  isMongoConnected: () => isMongoConnected
};
