/**
 * Test script to directly call Vectorizer.ai API
 * This will help debug the PDF black output issue
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const VECTORIZER_API_KEY = process.env.VECTORIZER_API_KEY;
const VECTORIZER_API_SECRET = process.env.VECTORIZER_API_SECRET;

async function testVectorization(imagePath, outputFormat = 'pdf') {
  console.log('\n=== Vectorizer.ai API Test ===\n');
  console.log('Image:', imagePath);
  console.log('Format:', outputFormat);
  console.log('API Key:', VECTORIZER_API_KEY ? 'Present' : 'Missing');
  console.log('API Secret:', VECTORIZER_API_SECRET ? 'Present' : 'Missing');

  if (!VECTORIZER_API_KEY || !VECTORIZER_API_SECRET) {
    console.error('\n❌ ERROR: Missing API credentials');
    console.error('Please set VECTORIZER_API_KEY and VECTORIZER_API_SECRET in .env.local');
    process.exit(1);
  }

  if (!fs.existsSync(imagePath)) {
    console.error(`\n❌ ERROR: Image file not found: ${imagePath}`);
    process.exit(1);
  }

  try {
    // Read the image file
    const imageBuffer = fs.readFileSync(imagePath);
    console.log(`\nImage size: ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB`);

    // Create form data
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: path.basename(imagePath),
      contentType: 'image/jpeg',
    });

    // Add parameters EXACTLY as documented
    formData.append('mode', 'production'); // CRITICAL: use production mode
    formData.append('output.file_format', outputFormat);

    // Processing options
    formData.append('processing.max_colors', '256'); // Full color range
    formData.append('processing.shapes.min_area_px', '1.0'); // Filter tiny shapes

    // Output styling (CRITICAL for PDF)
    formData.append('output.draw_style', 'fill_shapes'); // Fill shapes, not strokes
    formData.append('output.shape_stacking', 'stacked'); // Stack shapes
    formData.append('output.group_by', 'color'); // Group by color

    // Gap filler for print quality
    formData.append('output.gap_filler.enabled', 'true');
    formData.append('output.gap_filler.stroke_width', '0.5');

    // Output DPI
    formData.append('output.size.output_dpi', '300');

    console.log('\n=== Request Parameters ===');
    console.log('mode: production');
    console.log('output.file_format:', outputFormat);
    console.log('processing.max_colors: 256');
    console.log('processing.shapes.min_area_px: 1.0');
    console.log('output.draw_style: fill_shapes');
    console.log('output.shape_stacking: stacked');
    console.log('output.group_by: color');
    console.log('output.gap_filler.enabled: true');
    console.log('output.gap_filler.stroke_width: 0.5');
    console.log('output.size.output_dpi: 300');

    console.log('\n=== Sending Request to Vectorizer.ai ===');
    const startTime = Date.now();

    const response = await fetch('https://vectorizer.ai/api/v1/vectorize', {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(`${VECTORIZER_API_KEY}:${VECTORIZER_API_SECRET}`).toString('base64'),
        ...formData.getHeaders(),
      },
      body: formData,
    });

    const processingTime = Date.now() - startTime;

    console.log('\n=== Response ===');
    console.log('Status:', response.status, response.statusText);
    console.log('Processing time:', processingTime, 'ms');

    // Log response headers
    console.log('\n=== Response Headers ===');
    response.headers.forEach((value, key) => {
      console.log(`${key}: ${value}`);
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('\n❌ ERROR Response:');
      console.error(errorText);
      process.exit(1);
    }

    // Save the result
    const resultBuffer = await response.buffer();
    const outputPath = path.join(__dirname, `../test-vectorized.${outputFormat}`);
    fs.writeFileSync(outputPath, resultBuffer);

    console.log('\n✅ SUCCESS!');
    console.log('Output saved to:', outputPath);
    console.log('File size:', (resultBuffer.length / 1024).toFixed(2), 'KB');

    // If PDF, also try SVG for comparison
    if (outputFormat === 'pdf') {
      console.log('\n=== Also testing SVG for comparison ===');
      await testVectorization(imagePath, 'svg');
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Get image path from command line or use default
const imagePath = process.argv[2] || '/Users/shannonherod/Downloads/CleanShot 2025-11-17 at 21.43.32@2x.png';
const format = process.argv[3] || 'pdf';

testVectorization(imagePath, format);
