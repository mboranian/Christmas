#!/usr/bin/env node

// Script to create the Christmas Lists Gist for mboranian
// Run this once to set up the Gist, then update the GIST_ID in gistStorage.ts

const https = require('https');

const initialData = {
  lists: [],
  lastUpdated: Date.now()
};

const gistPayload = {
  description: '780 Christmas Lists - Private Data Storage',
  public: false,
  files: {
    'christmas-lists.json': {
      content: JSON.stringify(initialData, null, 2)
    }
  }
};

const postData = JSON.stringify(gistPayload);

const options = {
  hostname: 'api.github.com',
  port: 443,
  path: '/gists',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'User-Agent': 'Christmas-Lists-Setup',
    'Accept': 'application/vnd.github.v3+json'
    // Note: For private gists, you'll need to add authentication:
    // 'Authorization': 'token YOUR_GITHUB_TOKEN'
  }
};

console.log('Creating GitHub Gist for Christmas Lists...');
console.log('\n⚠️  IMPORTANT: To create a private gist, you need to:');
console.log('1. Create a GitHub Personal Access Token with "gist" scope');
console.log('2. Add this header to the options above:');
console.log('   \'Authorization\': \'token YOUR_GITHUB_TOKEN\'');
console.log('3. Run this script again\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode === 201) {
        console.log('✅ Gist created successfully!');
        console.log(`\n📝 Gist ID: ${response.id}`);
        console.log(`🔗 Gist URL: ${response.html_url}`);
        console.log(`\n🔧 Update your gistStorage.ts file:`);
        console.log(`const GIST_ID = '${response.id}';`);
      } else {
        console.error('❌ Error creating gist:', response);
      }
    } catch (error) {
      console.error('❌ Error parsing response:', error);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error);
});

req.write(postData);
req.end();