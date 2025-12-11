const zlib = require('zlib');

// The base64-encoded content stream from the PDF
const compressedData = Buffer.from(
  'eNozAzEQMCBdMN4zCzMrc1papFJylcc6Xc1gZ1RlcGVwCXCZVg==',
  'base64'
);

try {
  const decompressed = zlib.inflateSync(compressedData);
  console.log('Decompressed content stream:');
  console.log(decompressed.toString('utf-8'));
  console.log('\nLength:', decompressed.length, 'bytes');
} catch (error) {
  console.error('Failed to decompress:', error.message);
}
