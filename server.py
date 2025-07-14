#!/usr/bin/env python3
"""
DTF Editor - Python Proxy Server
Handles Vectorizer.AI and Clipping Magic API calls to avoid CORS issues
"""

import os
import base64
import requests
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import io

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
VECTORIZER_ENDPOINT = 'https://vectorizer.ai/api/v1/vectorize'
VECTORIZER_API_ID = 'vkxq4f4d9b7qwjh'
VECTORIZER_API_SECRET = '3i3cdh559d3e1csqi2e4rsk319qdrbn2otls0flbdjqo9qmrnkfj'

CLIPPING_MAGIC_ENDPOINT = 'https://api.clippingmagic.com/remove-background'
CLIPPING_MAGIC_API_ID = '24469'
CLIPPING_MAGIC_API_SECRET = 'mngg89bme2has9hojc7n5cbjr8ptg3bjc8r3v225c555nhkvv11'

# File upload configuration
UPLOAD_FOLDER = 'uploads'
MAX_FILE_SIZE = 30 * 1024 * 1024  # 30MB
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    """Serve the main application"""
    return send_file('index.html')

@app.route('/api/vectorize', methods=['POST'])
def vectorize():
    """Vectorize image using Vectorizer.AI API"""
    try:
        print("Vectorization request received")
        
        # Check if file was uploaded
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Only images are allowed.'}), 400
        
        # Read file data
        file_data = file.read()
        if len(file_data) > MAX_FILE_SIZE:
            return jsonify({'error': 'File too large. Maximum size is 30MB.'}), 400
        
        print(f"Processing file: {file.filename} ({len(file_data)} bytes)")
        
        # Create Basic Auth header
        credentials = base64.b64encode(f"{VECTORIZER_API_ID}:{VECTORIZER_API_SECRET}".encode()).decode()
        
        # Prepare files for Vectorizer.AI
        files = {
            'image': (secure_filename(file.filename), io.BytesIO(file_data), file.content_type)
        }
        
        headers = {
            'Authorization': f'Basic {credentials}'
        }
        
        print("Making request to Vectorizer.AI...")
        
        # Make request to Vectorizer.AI
        response = requests.post(
            VECTORIZER_ENDPOINT,
            files=files,
            headers=headers,
            timeout=60
        )
        
        print(f"Vectorizer.AI response status: {response.status_code}")
        
        if not response.ok:
            print(f"Vectorizer.AI error: {response.text}")
            return jsonify({
                'error': f'Vectorizer.AI API error: {response.status_code} - {response.reason}',
                'details': response.text
            }), response.status_code
        
        # Get the vectorized image data
        vector_data = response.content
        print(f"Vectorization successful: {len(vector_data)} bytes")
        
        # Return the vectorized image
        return send_file(
            io.BytesIO(vector_data),
            mimetype='image/svg+xml',
            as_attachment=True,
            download_name='vectorized.svg'
        )
        
    except Exception as e:
        print(f"Vectorization error: {str(e)}")
        return jsonify({
            'error': 'Internal server error during vectorization',
            'details': str(e)
        }), 500

@app.route('/api/remove-background', methods=['POST'])
def remove_background():
    """Remove background using Clipping Magic API (placeholder)"""
    try:
        print("Background removal request received")
        
        # Check if file was uploaded
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Only images are allowed.'}), 400
        
        print(f"Processing file: {file.filename}")
        
        # TODO: Implement Clipping Magic API call once we have the correct endpoint
        return jsonify({
            'error': 'Background removal not yet implemented - need correct Clipping Magic API endpoint',
            'details': 'The Clipping Magic API endpoint needs to be verified and implemented'
        }), 501
        
    except Exception as e:
        print(f"Background removal error: {str(e)}")
        return jsonify({
            'error': 'Internal server error during background removal',
            'details': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'timestamp': requests.utils.quote(str(requests.utils.utcnow())),
        'services': {
            'vectorizer': 'available',
            'clippingMagic': 'pending'
        }
    })

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    return send_file(filename)

if __name__ == '__main__':
    print("🚀 DTF Editor Python server starting...")
    print("📁 Static files served from current directory")
    print("🔧 API endpoints:")
    print("   - POST /api/vectorize - Vectorize images")
    print("   - POST /api/remove-background - Remove backgrounds (pending)")
    print("   - GET /api/health - Health check")
    print("🌐 Server will be available at: http://localhost:5000")
    
    app.run(host='0.0.0.0', port=5000, debug=True) 