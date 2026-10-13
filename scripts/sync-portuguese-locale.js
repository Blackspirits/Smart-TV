// Internal pt is derived from pt-PT. Brazil is never modified.
const fs = require('fs');
const path = require('path');
const resources = path.join(__dirname, '../packages/app/resources');
fs.copyFileSync(path.join(resources, 'pt-PT/strings.json'), path.join(resources, 'pt/strings.json'));
