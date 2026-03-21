const fs = require('fs');

let content = fs.readFileSync('lib/store.ts', 'utf8');

// Replace collection(db, "name") with getTenantCollection("name")
content = content.replace(/collection\(db,\s*/g, 'getTenantCollection(');

// Replace doc(db, "name", "id") with getTenantDoc("name", "id")
content = content.replace(/doc\(db,\s*/g, 'getTenantDoc(');

fs.writeFileSync('lib/store.ts', content);
console.log('Replaced successfully');
