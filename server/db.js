const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFilePath = path.join(dataDir, 'db.json');

const defaultDb = {
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

function readDb() {
  try {
    if (fs.existsSync(dbFilePath)) {
      const data = fs.readFileSync(dbFilePath, 'utf8');
      return JSON.parse(data);
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

// Initialize db if not existing
if (!fs.existsSync(dbFilePath)) {
  writeDb(defaultDb);
}

module.exports = {
  readDb,
  writeDb
};
