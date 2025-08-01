# API Code Examples

This document contains verified code examples from official API documentation for various services used in the DTF Editor project. These examples should be referenced when implementing or updating API integrations.

## API Costs (2025 Rates)

### Service Pricing
- **Deep-Image.ai**: $0.08 per image
- **ClippingMagic**: $0.125 per image  
- **Vectorizer.ai**: $0.20 per image
- **OpenAI DALL-E 3**: $0.04 per image (standard quality 1024x1024)
- **Stripe**: 2.9% + $0.30 per transaction

### Profitability by Plan
- **Pay-as-you-go**: 70-80% profit margin
- **Basic Plan**: 80-85% profit margin
- **Starter Plan**: 83-90% profit margin

## Table of Contents
- [Deep-Image.ai](#deep-imageai)
- [ClippingMagic](#clippingmagic)
- [Vectorizer.ai](#vectorizerai)
- [OpenAI](#openai)
- [Stripe](#stripe)
- [Supabase](#supabase)

---

## Deep-Image.ai

**Last Updated: January 2025**  
**Official Docs: https://documentation.deep-image.ai/**

### Authentication
```http
Header: x-api-key: YOUR_API_KEY
```
Get your API key from: https://deep-image.ai/app/my-profile/api

### Basic Upscaling Example
```json
// Request - Upscale image by 2x
POST https://deep-image.ai/rest_api/process_result
{
  "url": "https://deep-image.ai/api-example2.jpg",
  "width": "200%",
  "height": "200%"
}

// Response - Immediate result
{
  "status": "complete",
  "result_url": "https://neuroapi-store.s3.eu-central-1.amazonaws.com/2024-03-07/d894c96a-0dda-46cd-9197-10c596f7e27c.jpg",
  "processing_time": 4.2
}

// Response - Queued job
{
  "status": "processing",
  "job": "a8784c00-dc6b-11ee-ad50-9ec3ba0205c0"
}
```

### Upscaling with Enhancements
```json
// Request - Upscale 4x with all enhancements
{
  "url": "https://example.com/image.jpg",
  "width": "400%",
  "height": "400%",
  "enhancements": ["denoise", "deblur", "light", "color"]
}

// Request - With specific enhancement parameters
{
  "url": "https://example.com/image.jpg",
  "width": "200%",
  "enhancements": ["denoise", "deblur", "light", "color"],
  "denoise_parameters": {
    "type": "v2"  // v2 recommended for heavily noisy images
  },
  "light_parameters": {
    "type": "hdr_light_advanced",
    "level": 0.8
  },
  "color_parameters": {
    "type": "hdr_light_advanced",
    "level": 0.5
  }
}
```

### Form-data Upload Example
```javascript
// Using FormData for direct file upload
const formData = new FormData();
formData.append('image', fileBlob);
formData.append('json', JSON.stringify({
  "width": 2000,
  "enhancements": ["denoise", "deblur", "light"]
}));

fetch('https://deep-image.ai/rest_api/process_result', {
  method: 'POST',
  headers: {
    'x-api-key': 'YOUR_API_KEY'
  },
  body: formData
});
```

### Advanced Features

#### Background Generation
```json
{
  "url": "image_url",
  "generate_background": true,
  "face": true,  // For avatar creation
  "control_mode": "image_to_image"
}
```

#### Face Enhancement
```json
{
  "url": "image_url",
  "enhancements": ["face_enhance"],
  "width": "200%"
}
```

#### Canvas Extension
```json
{
  "url": "image_url",
  "canvas_extension": {
    "top": 100,
    "bottom": 100,
    "left": 50,
    "right": 50
  }
}
```

### API Endpoints
- `POST /rest_api/process_result` - Process and wait for result (up to 25 seconds)
- `POST /rest_api/process` - Schedule processing job (returns immediately)
- `GET /rest_api/result/{hash}` - Get job result by hash
- `DELETE /rest_api/result/{hash}` - Delete completed job
- `GET /rest_api/me` - Get user profile and credits info

### Polling for Results
```javascript
// When you get a job hash, poll for results
async function pollForResult(jobHash, apiKey) {
  const maxAttempts = 24;
  const delayMs = 5000;
  
  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, delayMs));
    
    const response = await fetch(`https://deep-image.ai/rest_api/result/${jobHash}`, {
      headers: { 'x-api-key': apiKey }
    });
    
    const result = await response.json();
    
    if (result.status === 'complete') {
      return result.result_url;
    } else if (result.status === 'failed') {
      throw new Error(result.error || 'Processing failed');
    }
  }
  throw new Error('Timeout waiting for result');
}
```

### Width/Height Parameters
- Percentage format: `"200%"` for 2x scale, `"400%"` for 4x scale
- Pixel format: `2000` for exact pixel dimensions  
- Set to `0` or omit for auto-calculation based on aspect ratio
- Maximum output: 300 megapixels or 16x upscaling

### Available Enhancements
- `denoise` - Remove noise from image (supports v1 and v2 models)
- `deblur` - Sharpen blurry images
- `clean` - Remove artifacts from previous upscaling
- `face_enhance` - Enhance facial details
- `light` - Adjust lighting and exposure
- `color` - Enhance color saturation
- `white_balance` - Auto white balance correction (deprecated, use light/color instead)
- `exposure_correction` - Fix exposure issues (deprecated, use light instead)

### Complete Parameter Reference

#### Main Processing Parameters
- **url**: (string) Image URL or base64 encoded image in JSON requests
- **image**: (file) Image file for form-data requests
- **width**: (integer/string) Target width in pixels (e.g., 2000) or percentage (e.g., "200%")
- **height**: (integer/string) Target height in pixels or percentage
- **output_format**: (string) Output format: "jpg", "png", "webp"
- **quality**: (integer) Output quality 1-100 (default varies by format)
- **max_file_size**: (string) Maximum output file size (e.g., "5MB")

#### Enhancements Array
```json
"enhancements": ["denoise", "deblur", "light", "color", "clean", "face_enhance"]
```
- **denoise**: Remove image noise
- **deblur**: Sharpen blurry images
- **light**: Enhance lighting and exposure
- **color**: Enhance color saturation
- **clean**: Remove artifacts
- **face_enhance**: Enhance facial details
- **dehazing**: Remove atmospheric haze
- **sharpen**: Additional sharpening

#### Background Object
```json
"background": {
  "remove": "auto",           // Automatic background removal
  "color": "#FFFFFF",         // Replace with solid color
  "generate": {               // AI background generation
    "description": "prompt",
    "model_type": "realistic"
  }
}
```

#### Image Generation Parameters
```json
"background": {
  "generate": {
    "description": "tropical beach sunset",
    "model_type": "realistic",  // "realistic", "fantasy", "premium"
    "adapter_type": "generate_background",  // See adapter types below
    "sample_num": 42,           // Random seed
    "face_id": true,            // Alternative face algorithm
    "controlnet_conditioning_scale": 0.5  // Edge preservation (0-1)
  }
}
```

**Adapter Types:**
- `generate_background`: Generates background around main object (default)
- `face`: Creates avatar using first found face
- `control`: Image-to-image generation based on image and edges
- `control2`: Generation based on edges only
- `upscale`: Generative upscaling with prompts
- `inpainting`: Specialized image modification

#### Light & Color Parameters
```json
"light_parameters": {
  "type": "hdr_light_advanced",
  "level": 0.8  // 0-1 range
},
"color_parameters": {
  "type": "hdr_light_advanced",
  "level": 0.5  // 0-1 range
}
```

#### Denoise Parameters
```json
"denoise_parameters": {
  "type": "v2"  // "v1" (default) or "v2" (for heavily noisy images)
}
```

#### Caption/Watermark Parameters
```json
"caption": {
  "url": "https://example.com/watermark.png",
  "position": "RB",  // TL, TC, TR, ML, MC, MR, BL, BC, BR
  "target_width_percentage": 25,  // Size relative to image
  "padding": 20,      // Pixels from edge
  "opacity": 85       // 0-100
}
```

### Error Responses
```json
// Authentication error
{
  "error": "Invalid API key",
  "status": "error"
}

// Processing error
{
  "status": "failed",
  "error": "Image processing failed: Invalid image format"
}

// Rate limit error (429)
{
  "error": "Rate limit exceeded",
  "status": "error"
}

// Bad request (400)
{
  "error": "Invalid parameters",
  "status": "error"
}

// Job not found (404)
{
  "status": "not_found",
  "error": "Job not found"
}
```

### Complete Examples

#### Advanced Processing with All Features
```json
POST /rest_api/process_result
{
  "url": "https://example.com/portrait.jpg",
  "width": 4000,
  "height": 0,  // Auto-calculate
  "enhancements": ["denoise", "deblur", "light", "color", "face_enhance"],
  "denoise_parameters": {
    "type": "v2"
  },
  "light_parameters": {
    "type": "hdr_light_advanced",
    "level": 0.9
  },
  "color_parameters": {
    "type": "hdr_light_advanced",
    "level": 0.7
  },
  "background": {
    "remove": "auto",
    "generate": {
      "description": "professional office interior, bokeh",
      "model_type": "realistic",
      "adapter_type": "generate_background",
      "sample_num": 12345,
      "controlnet_conditioning_scale": 0.6
    }
  },
  "output_format": "png",
  "quality": 95,
  "caption": {
    "url": "https://example.com/logo.png",
    "position": "BR",
    "target_width_percentage": 15,
    "padding": 30,
    "opacity": 70
  }
}
```

#### Python Form-Data Example
```python
import requests
import json

API_KEY = "YOUR_API_KEY"
headers = {'x-api-key': API_KEY}

# Parameters for form-data request
data = {
    "enhancements": ["denoise", "deblur", "light", "color"],
    "width": 2000,
    "background": {
        "remove": "auto",
        "color": "#FFFFFF"
    },
    "light_parameters": {
        "type": "hdr_light_advanced",
        "level": 0.8
    }
}

# Must wrap parameters in 'parameters' key for form-data
data_dumped = {"parameters": json.dumps(data)}

with open('input.jpg', 'rb') as f:
    response = requests.post(
        'https://deep-image.ai/rest_api/process_result',
        headers=headers,
        files={'image': f},
        data=data_dumped
    )
    
result = response.json()
print(f"Result URL: {result['result_url']}")
```

#### Face Avatar Generation
```json
{
  "url": "https://example.com/face.jpg",
  "background": {
    "generate": {
      "description": "cyberpunk neon city background",
      "model_type": "fantasy",
      "adapter_type": "face",
      "face_id": true,
      "sample_num": 99
    }
  },
  "width": 1024,
  "height": 1024
}
```

### User Profile Endpoint
```http
GET /rest_api/me
x-api-key: YOUR_API_KEY

Response:
{
  "credits": 150,
  "username": "user@example.com",
  "email": "user@example.com",
  "api_key": "YOUR_API_KEY",
  "language": "en",
  "webhook_url": null,
  "billing_address": {
    "name": "John Doe",
    "address": "123 Main St",
    "city": "New York",
    "country": "US"
  }
}
```

---

## ClippingMagic

**Last Updated: January 2025**  
**Official Docs: https://clippingmagic.com/api/overview**

### Authentication
```http
Authorization: Basic [base64(api_id:api_secret)]
```

### White Label Editor Upload (Java Example)
```java
// Requires: org.apache.httpcomponents.client5:httpclient5-fluent
//      and: com.fasterxml.jackson.core:jackson-databind

Request request = Request.post("https://clippingmagic.com/api/v1/images")
   .addHeader("Authorization", "Basic MTIzOltzZWNyZXRd")
   .body(
      MultipartEntityBuilder.create()
         .addBinaryBody("image", new File("example.jpeg")) // TODO: Replace with your image
         .addTextBody("format", "json")
         .addTextBody("test", "true") // TODO: Remove for production
         // TODO: Add more upload parameters here
         .build()
      );
ClassicHttpResponse response = (ClassicHttpResponse) request.execute().returnResponse();

if (response.getCode() == 200) {
   // Parse body
   String body = "";
   try (BufferedReader buffer = new BufferedReader(new InputStreamReader(response.getEntity().getContent()))) {
      body = buffer.lines().collect(Collectors.joining("\n"));
   }
   System.out.println("Body: " + body);
   JsonNode image = new ObjectMapper().readTree(body).get("image");

   // TODO: Store these
   String imageId = image.get("id").asText();
   String imageSecret = image.get("secret").asText();
   System.out.println("Id: " + imageId + ", Secret: " + imageSecret);
} else {
   System.out.println("Request Failed: Status: " + response.getCode() + ", Reason: " + response.getReasonPhrase());
}
```

### Upload Response Format
```json
{
  "image": {
    "id": "12345678",
    "secret": "abcdefghijklmnop",
    "resultRevision": 1
  }
}
```

### JavaScript/Node.js Example (Converted)
```javascript
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

// Create form data
const formData = new FormData();
formData.append('image', fs.createReadStream('example.jpeg'));
formData.append('format', 'json');
formData.append('test', 'true'); // Remove for production

// Make request
const response = await axios.post('https://clippingmagic.com/api/v1/images', formData, {
  headers: {
    'Authorization': 'Basic ' + Buffer.from(apiId + ':' + apiSecret).toString('base64'),
    ...formData.getHeaders()
  }
});

if (response.status === 200) {
  const { image } = response.data;
  console.log('Image ID:', image.id);
  console.log('Image Secret:', image.secret);
  // Store these for later use
}
```

### Upload Parameters
- **image**: Binary image file (required)
- **format**: Response format - "json" or "result" (default: "result")
- **test**: Set to "true" for testing without using credits
- **background**: Background color options
- **foreground**: Foreground processing options

### Retrieving Results
After uploading, use the image ID and secret to retrieve the processed result:
```http
GET https://clippingmagic.com/api/v1/images/{id}
Authorization: Basic [base64(api_id:api_secret)]
```

### Important Notes
- The `test` parameter should be removed in production to actually process images
- Store the returned `id` and `secret` - they're needed to retrieve results
- Images are processed asynchronously - poll for results
- White label editor allows custom branding and integration

### White Label Smart Editor Embedding
```html
<script src="https://clippingmagic.com/api/v1/ClippingMagic.js" type="text/javascript"></script>
<script type="text/javascript">
  function myCallback(opts) {
    // TODO: Replace this with your own functionality
    switch (opts.event) {
      case "error":
          alert("An error occurred: " + opts.error.status + ", " + opts.error.code + ", " + opts.error.message);
          break;

      case "result-generated":
          alert("Generated a result for " + opts.image.id + ", " + opts.image.secret);
          break;

      case "editor-exit":
          alert("The editor dialog closed");
          break;
    }
  }
  
  var errorsArray = ClippingMagic.initialize({apiId: 123});
  
  if (errorsArray.length > 0) {
    alert("Sorry, your browser is missing some required features: \n\n " + errorsArray.join("\n "));
  } else {
    ClippingMagic.edit({
      "image" : {
        "id" : 2346,
        "secret" : "image_secret1"
      },
      "useStickySettings" : true,
      "hideBottomToolbar" : false,
      "locale" : "en-US"
    }, myCallback);
  }
</script>
```

### Editor Integration Notes
- Replace hardcoded `id` and `secret` with values from upload response
- The `apiId` in `initialize()` should be your actual API ID
- Callback events:
  - `error`: Handle any errors that occur
  - `result-generated`: Triggered when background removal is complete
  - `editor-exit`: Triggered when user closes the editor
- Configuration options:
  - `useStickySettings`: Remembers user's editor settings
  - `hideBottomToolbar`: Controls toolbar visibility
  - `locale`: Sets the editor language

### React/Next.js Integration Example
```javascript
// ClippingMagic editor component
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    ClippingMagic: any;
  }
}

export function ClippingMagicEditor({ imageId, imageSecret, apiId, onComplete }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Load ClippingMagic script
    const script = document.createElement('script');
    script.src = 'https://clippingmagic.com/api/v1/ClippingMagic.js';
    script.onload = () => {
      const errors = window.ClippingMagic.initialize({ apiId });
      if (errors.length === 0) {
        setIsReady(true);
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [apiId]);

  const openEditor = () => {
    if (!isReady) return;

    window.ClippingMagic.edit({
      image: { id: imageId, secret: imageSecret },
      useStickySettings: true,
      hideBottomToolbar: false,
      locale: 'en-US'
    }, (opts) => {
      switch (opts.event) {
        case 'error':
          console.error('ClippingMagic error:', opts.error);
          break;
        case 'result-generated':
          onComplete(opts.image);
          break;
        case 'editor-exit':
          // Handle editor close
          break;
      }
    });
  };

  return (
    <button onClick={openEditor} disabled={!isReady}>
      Open Background Removal Editor
    </button>
  );
}
```

### White Label Editor Configuration
The ClippingMagic.edit() function opens the editor in a popup window (not an iframe). Key configuration options:

```javascript
ClippingMagic.edit({
  "image": {
    "id": imageId,
    "secret": imageSecret
  },
  "useStickySettings": true,    // Use saved settings across images
  "hideBottomToolbar": false,   // Show/hide editor toolbar
  "locale": "en-US"             // Set editor language
}, callback);
```

### Callback Events
- `result-generated`: User clicked 'Done', result is ready for download
- `editor-exit`: User closed the editor without saving
- `error`: An error occurred

### Browser Requirements
The editor opens in a **popup window**. Users must:
1. Allow popups for your domain
2. Disable popup blockers
3. Click to open (cannot auto-open due to browser restrictions)

---

## Vectorizer.ai

**Last Updated: January 2025**  
**Official Docs: https://vectorizer.ai/api**

### Authentication
Vectorizer.ai uses HTTP Basic Authentication. All requests must be made over HTTPS.
```http
Authorization: Basic [base64(API_ID:API_SECRET)]
```

### Basic Vectorization Example (PHP/cURL)
```php
$ch = curl_init('https://vectorizer.ai/api/v1/vectorize');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Authorization: Basic dmt5YzY3a3FhMjd5aWRkOltzZWNyZXRd'));
curl_setopt($ch, CURLOPT_POSTFIELDS, array(
    'image' => curl_file_create('example.jpeg'),
    'mode' => 'production', // or 'preview' (0.2 credits) or 'test' (free)
    'output.file_format' => 'svg' // or pdf, eps, dxf, png
));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

$data = curl_exec($ch);
if (curl_getinfo($ch, CURLINFO_HTTP_CODE) == 200) {
    file_put_contents("result.svg", $data);
    // Get image token for future downloads
    $imageToken = curl_getinfo($ch, CURLINFO_HEADER_OUT)['X-Image-Token'];
} else {
    echo "Error: " . $data;
}
curl_close($ch);
```

### Python Example
```python
import requests

# Basic vectorization
response = requests.post(
    'https://vectorizer.ai/api/v1/vectorize',
    files={'image': open('example.jpeg', 'rb')},
    data={
        'mode': 'production',
        'output.file_format': 'svg',
        'processing.max_colors': 24
    },
    auth=('API_ID', 'API_SECRET')
)

if response.status_code == 200:
    with open('result.svg', 'wb') as f:
        f.write(response.content)
    # Save image token for future operations
    image_token = response.headers.get('X-Image-Token')
```

### JavaScript/Node.js Example
```javascript
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

const formData = new FormData();
formData.append('image', fs.createReadStream('example.jpeg'));
formData.append('mode', 'production');
formData.append('output.file_format', 'svg');
formData.append('processing.max_colors', '24');

const response = await axios.post(
  'https://vectorizer.ai/api/v1/vectorize',
  formData,
  {
    headers: {
      ...formData.getHeaders(),
      'Authorization': 'Basic ' + Buffer.from('API_ID:API_SECRET').toString('base64')
    },
    responseType: 'arraybuffer'
  }
);

if (response.status === 200) {
  fs.writeFileSync('result.svg', response.data);
  const imageToken = response.headers['x-image-token'];
}
```

### Input Methods

#### 1. File Upload
```javascript
formData.append('image', fileStream);
```

#### 2. Base64 Encoded (Max 1MB)
```javascript
data: {
  'image.base64': base64EncodedImageString,
  'mode': 'production'
}
```

#### 3. URL
```javascript
data: {
  'image.url': 'https://example.com/image.jpg',
  'mode': 'production'
}
```

#### 4. Image Token (for re-processing)
```javascript
data: {
  'image.token': 'previously_returned_token',
  'output.file_format': 'pdf' // Get different format
}
```

### Processing Modes

| Mode | Credits | Description |
|------|---------|-------------|
| `test` | 0.000 | Free testing mode |
| `test_preview` | 0.000 | Free preview testing |
| `preview` | 0.200 | Quick preview result |
| `production` | 1.000 | Full quality result |

### Key Processing Parameters

```javascript
{
  // Image input (choose one)
  'image': file,                    // Binary file upload
  'image.url': 'https://...',      // URL to fetch
  'image.base64': 'base64string',  // Base64 encoded
  'image.token': 'token',          // Previous result token

  // Processing mode
  'mode': 'production',            // production, preview, test

  // Processing options
  'processing.max_colors': 0,      // 0-256, 0=unlimited
  'processing.palette': [          // Custom color palette
    {'color': '#FF0000'},
    {'color': '#00FF00'},
    {'color': '#0000FF'}
  ],
  
  // Output options
  'output.file_format': 'svg',     // svg, eps, pdf, dxf, png
  'output.bitmap.anti_aliasing_mode': 'anti_aliased',
  'output.size.scale': 1.0,
  'output.size.width': 1024,       // Pixels or percentage
  'output.size.height': 'auto',
  
  // Storage
  'policy.retention_days': 1       // 0-30 days (first day free)
}
```

### Color Palette Configuration

```javascript
// Basic palette
'processing.palette': [
  {'color': '#FF0000'},
  {'color': '#00FF00'}, 
  {'color': '#0000FF'}
]

// Advanced palette with ranges
'processing.palette': [
  {
    'color': '#FF0000',
    'from': {'h': 350, 's': 50, 'l': 40},
    'to': {'h': 10, 's': 100, 'l': 60}
  }
]
```

### Output Format Options

#### SVG Options
```javascript
{
  'output.file_format': 'svg',
  'output.svg.stroke_style': 'none',        // none, black, color
  'output.svg.fill_style': 'color',         // none, black, color  
  'output.svg.path_precision': 3,
  'output.svg.coordinate_precision': 3
}
```

#### PDF/EPS Options
```javascript
{
  'output.file_format': 'pdf',              // or 'eps'
  'output.vector.stroke_style': 'none',
  'output.vector.fill_style': 'color'
}
```

#### DXF Options
```javascript
{
  'output.file_format': 'dxf',
  'output.dxf.compatibility': 'r14',        // r14 or 2018
  'output.dxf.angbase': 'east',            // east or north
  'output.dxf.unit': 'mm',                 // mm, cm, m, in, ft
  'output.dxf.layer_mode': 'index'         // index or color
}
```

### Using Image Tokens for Multiple Formats

```javascript
// Step 1: Initial vectorization with retention
const response1 = await vectorize({
  'image': file,
  'mode': 'production',
  'output.file_format': 'svg',
  'policy.retention_days': 1  // Important!
});

const imageToken = response1.headers['x-image-token'];

// Step 2: Get different format using token
const response2 = await vectorize({
  'image.token': imageToken,
  'output.file_format': 'pdf'
});

// Step 3: Get another format (0.1 credits each)
const response3 = await vectorize({
  'image.token': imageToken,
  'output.file_format': 'dxf'
});
```

### Download Endpoint

```javascript
// Download production result after preview
const downloadResponse = await axios.post(
  'https://vectorizer.ai/api/v1/download',
  {
    'image.token': imageToken,
    'output.file_format': 'svg'
  },
  {
    auth: ['API_ID', 'API_SECRET'],
    responseType: 'arraybuffer'
  }
);
```

### Account Status

```javascript
const accountResponse = await axios.get(
  'https://vectorizer.ai/api/v1/account',
  {
    auth: ['API_ID', 'API_SECRET']
  }
);

// Response
{
  "subscription": {
    "credits_remaining": 500,
    "credits_allotted": 500,
    "renewal_date": "2025-02-01"
  }
}
```

### Response Headers

| Header | Description |
|--------|-------------|
| `X-Image-Token` | Token for re-downloading/processing |
| `X-Credits-Charged` | Actual credits used |
| `X-Credits-Calculated` | Credits that would be charged (test mode) |

### Error Handling

```javascript
// HTTP Status Codes
// 200: Success
// 400: Bad Request (invalid parameters)
// 401: Authentication failed
// 402: Insufficient credits
// 413: Image too large
// 429: Rate limit exceeded
// 500: Server error

// Error Response Format
{
  "status": 400,
  "code": 40001,
  "message": "Invalid image format"
}

// Common Error Codes
// 40001: Invalid image format
// 40002: Image too large (>33MP)
// 40201: Insufficient credits
// 42901: Rate limit exceeded
```

### Complete Advanced Example

```javascript
const vectorizeImage = async (imagePath) => {
  const formData = new FormData();
  formData.append('image', fs.createReadStream(imagePath));
  
  // Advanced processing options
  formData.append('mode', 'production');
  formData.append('processing.max_colors', '16');
  formData.append('processing.min_area_px_sq', '4');
  formData.append('processing.corner_threshold', '60');
  formData.append('processing.length_threshold', '4.0');
  formData.append('processing.splice_threshold', '45');
  
  // Output configuration
  formData.append('output.file_format', 'svg');
  formData.append('output.svg.stroke_style', 'none');
  formData.append('output.svg.fill_style', 'color');
  formData.append('output.size.scale', '2.0');
  
  // Retention for multiple format downloads
  formData.append('policy.retention_days', '7');
  
  try {
    const response = await axios.post(
      'https://vectorizer.ai/api/v1/vectorize',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': 'Basic ' + Buffer.from(`${API_ID}:${API_SECRET}`).toString('base64')
        },
        responseType: 'arraybuffer',
        timeout: 180000 // 180 seconds
      }
    );
    
    if (response.status === 200) {
      const imageToken = response.headers['x-image-token'];
      const creditsCharged = response.headers['x-credits-charged'];
      
      return {
        data: response.data,
        token: imageToken,
        credits: creditsCharged
      };
    }
  } catch (error) {
    if (error.response) {
      const errorData = JSON.parse(error.response.data.toString());
      console.error('API Error:', errorData.message);
      
      // Handle specific errors
      switch (error.response.status) {
        case 402:
          throw new Error('Insufficient credits');
        case 429:
          // Implement backoff and retry
          throw new Error('Rate limit exceeded');
        default:
          throw new Error(errorData.message);
      }
    }
    throw error;
  }
};
```

### Rate Limiting Strategy

```javascript
class VectorizerClient {
  constructor(apiId, apiSecret, maxThreads = 5) {
    this.auth = Buffer.from(`${apiId}:${apiSecret}`).toString('base64');
    this.maxThreads = maxThreads;
    this.activeRequests = 0;
    this.queue = [];
  }
  
  async vectorize(options) {
    // Wait if at thread limit
    while (this.activeRequests >= this.maxThreads) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.activeRequests++;
    
    try {
      const response = await this._makeRequest(options);
      return response;
    } catch (error) {
      if (error.response?.status === 429) {
        // Linear backoff
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.vectorize(options); // Retry
      }
      throw error;
    } finally {
      this.activeRequests--;
    }
  }
}
```

### Best Practices

1. **Use Image Tokens**: Process once, download multiple formats
2. **Preview Mode**: Use for user previews (0.2 credits)
3. **Test Mode**: Use during development (free)
4. **Rate Limiting**: Start with 5 threads, increase gradually
5. **Timeout**: Set client timeout to at least 180 seconds
6. **Error Handling**: Implement retry logic for 429 errors
7. **File Size**: Images must be under 33,554,432 pixels
8. **Formats**: Use PNG for transparency, JPEG for photos

---

## OpenAI

### ChatGPT Image Generation
```json
// IMPORTANT: Check Context7 MCP for latest ChatGPT image generation API
// Search: "ChatGPT image generation API 2025" or "OpenAI image generation with ChatGPT"
// The implementation details may differ from traditional DALL-E endpoints

// Note: ChatGPT's image generation capabilities may be accessed through:
// 1. Chat completions endpoint with image generation prompts
// 2. Specialized image generation endpoint
// 3. Multi-modal responses

// Example structure (verify with Context7):
{
  "model": "gpt-4-vision-preview",
  "messages": [
    {
      "role": "user", 
      "content": "Generate an image of [description]"
    }
  ]
}
```

---

## Stripe

**Last Updated: January 2025**  
**Official Docs: https://docs.stripe.com/**

### Subscription Plan Switching with Proration

#### Basic Plan Switch
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Update subscription to new price with default proration
const subscription = await stripe.subscriptions.update(
  'sub_1234567890',
  {
    items: [{
      id: 'si_1234567890', // subscription item ID
      price: 'price_new_plan_id'
    }],
    proration_behavior: 'create_prorations' // default behavior
  }
);
```

#### Immediate Billing (Charge Now)
```javascript
// Bill customer immediately for proration adjustments
const subscription = await stripe.subscriptions.update(
  subscriptionId,
  {
    items: [{
      id: subscriptionItemId,
      price: newPriceId
    }],
    proration_behavior: 'always_invoice' // generates invoice immediately
  }
);
```

#### No Proration (Switch at Next Cycle)
```javascript
// Switch plans without any proration adjustments
const subscription = await stripe.subscriptions.update(
  subscriptionId,
  {
    items: [{
      id: subscriptionItemId,
      price: newPriceId
    }],
    proration_behavior: 'none' // no credit or charge adjustments
  }
);
```

#### Preview Proration Before Applying
```javascript
// Preview what the customer would be charged
const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
  subscription: subscriptionId,
  subscription_items: [{
    id: subscriptionItemId,
    price: newPriceId
  }],
  subscription_proration_behavior: 'create_prorations'
});

// Calculate proration amount
const prorationAmount = upcomingInvoice.lines.data
  .filter(line => line.proration)
  .reduce((total, line) => total + line.amount, 0);

console.log('Proration amount:', prorationAmount / 100); // Convert cents to dollars
```

#### Handle Downgrade with Credit Refund
```javascript
// Downgrade subscription and optionally refund credit
async function downgradeWithRefund(subscriptionId, newPriceId) {
  // Update subscription (creates credit)
  const subscription = await stripe.subscriptions.update(
    subscriptionId,
    {
      items: [{
        id: (await stripe.subscriptions.retrieve(subscriptionId)).items.data[0].id,
        price: newPriceId
      }],
      proration_behavior: 'create_prorations'
    }
  );
  
  // Check for credit balance
  const customer = await stripe.customers.retrieve(subscription.customer);
  
  if (customer.balance < 0) { // Negative balance = credit
    const creditAmount = Math.abs(customer.balance);
    
    // Create refund for credit
    const refund = await stripe.refunds.create({
      customer: customer.id,
      amount: creditAmount,
      reason: 'requested_by_customer',
      metadata: {
        reason: 'subscription_downgrade_credit'
      }
    });
    
    // Reset customer balance
    await stripe.customers.update(customer.id, {
      balance: 0
    });
    
    return { subscription, refund };
  }
  
  return { subscription };
}
```

#### Schedule Future Plan Change
```javascript
// Schedule a plan change for a specific date
const schedule = await stripe.subscriptionSchedules.create({
  from_subscription: subscriptionId
});

const updatedSchedule = await stripe.subscriptionSchedules.update(
  schedule.id,
  {
    phases: [
      {
        start_date: subscription.current_period_start,
        end_date: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
        items: [{
          price: currentPriceId,
          quantity: 1
        }]
      },
      {
        items: [{
          price: newPriceId,
          quantity: 1
        }],
        proration_behavior: 'create_prorations'
      }
    ]
  }
);
```

### Create Payment Intent
```javascript
// Create a payment intent for one-time payment
const paymentIntent = await stripe.paymentIntents.create({
  amount: 2000, // $20.00 in cents
  currency: 'usd',
  payment_method_types: ['card'],
  metadata: {
    order_id: '123456',
    customer_email: 'customer@example.com'
  }
});

// Response includes client_secret for frontend confirmation
{
  "id": "pi_1234567890",
  "client_secret": "pi_1234567890_secret_abcdef",
  "amount": 2000,
  "currency": "usd",
  "status": "requires_payment_method"
}
```

### Create Subscription
```javascript
// Create a new subscription
const subscription = await stripe.subscriptions.create({
  customer: 'cus_1234567890',
  items: [{
    price: 'price_1234567890' // price ID from Stripe dashboard
  }],
  payment_behavior: 'default_incomplete',
  expand: ['latest_invoice.payment_intent'],
  metadata: {
    plan_name: 'Pro Plan',
    user_id: 'user_123'
  }
});

// Response includes payment intent for initial payment
{
  "id": "sub_1234567890",
  "customer": "cus_1234567890",
  "status": "incomplete",
  "latest_invoice": {
    "payment_intent": {
      "client_secret": "pi_1234567890_secret_abcdef"
    }
  }
}
```

### Webhook Event Handling
```javascript
// Verify webhook signature and handle events
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      // Handle subscription update (plan changes, etc.)
      break;
      
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      // Handle successful payment
      break;
      
    case 'customer.subscription.deleted':
      const deletedSub = event.data.object;
      // Handle subscription cancellation
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  
  res.json({received: true});
});
```

### Proration Behavior Reference

| Behavior | Description | Use Case |
|----------|-------------|----------|
| `create_prorations` | Creates prorations, bills at next cycle | Default behavior |
| `always_invoice` | Creates prorations and bills immediately | Immediate upgrades |
| `none` | No prorations, new price at next cycle | Simple plan switches |

### Proration Calculation Example
- Customer on $100/month plan since May 1
- Upgrades to $200/month plan on May 15
- June 1 invoice will be $250:
  - $200 for June subscription
  - $50 proration (half month at +$100 difference)

### Best Practices
1. Always preview prorations before applying changes
2. Handle webhook events for subscription updates
3. Store subscription item IDs in your database
4. Use subscription schedules for complex changes
5. Consider using flexible billing mode for 2025 features
6. Test with Stripe test clocks to verify billing behavior

---

## Supabase

### Authentication Examples
```javascript
// Coming soon - add examples when provided
```

### Database Operations
```javascript
// Coming soon - add examples when provided
```

---

## Usage Notes

1. **Always check the official documentation** for the most up-to-date information
2. **Test endpoints** with small images first to avoid using credits
3. **Handle errors gracefully** - all APIs can return errors
4. **Monitor rate limits** - respect API rate limiting
5. **Store API keys securely** - never commit keys to version control

## Contributing

When adding new examples:
1. Include both request and response examples
2. Add comments explaining parameters
3. Include error response examples when available
4. Note any version-specific information
5. Add the date when the example was verified