# DTF Editor

A modern, responsive website for professional image editing with AI-powered vectorization and background removal. Built with HTML, CSS (Custom CSS System), and JavaScript.

## Features

- 🎨 **Modern UI/UX**: Clean, professional design inspired by Vectorizer.AI and Clipping Magic
- 📱 **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- 🖱️ **Drag & Drop**: Intuitive file upload with drag and drop support
- ⚡ **Real-time Progress**: Visual feedback during processing
- 🔒 **File Validation**: Secure file type and size validation
- 📥 **Easy Download**: One-click download of processed images
- 🎯 **Smooth Animations**: Beautiful transitions and hover effects
- 🔧 **Two Tools**: Vectorization and background removal in one platform

## Quick Start

1. **Clone or download** the project files
2. **Open `index.html`** in your web browser
3. **Start using** the vectorization tool!

## File Structure

```
vectorizer-website/
├── index.html          # Main HTML file
├── styles.css          # Custom CSS styles
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## API Integration

### Current Status
The website is now fully integrated with both Vectorizer.AI and Clipping Magic APIs and ready for production use!

### Setup Instructions

✅ **API Integration Complete!** The website is now fully configured with both Vectorizer.AI and Clipping Magic API credentials.

The API configuration is already set up in `script.js`:
```javascript
// Vectorizer.AI API configuration
this.vectorizerEndpoint = 'https://vectorizer.ai/api/v1/vectorize';
this.vectorizerApiId = 'vkxq4f4d9b7qwjh';
this.vectorizerApiSecret = '3i3cdh559d3e1csqi2e4rsk319qdrbn2otls0flbdjqo9qmrnkfj';

// Clipping Magic API configuration
this.clippingMagicEndpoint = 'https://clippingmagic.com/api/v1/remove-background';
this.clippingMagicApiId = '24469';
this.clippingMagicApiSecret = 'mngg89bme2has9hojc7n5cbjr8ptg3bjc8r3v225c555nhkvv11';
```

Both `vectorizeImage()` and `removeBackground()` methods now make real API calls using HTTP Basic Authentication.

### API Requirements

**Vectorizer.AI:**
- **Authentication**: HTTP Basic Authentication (API ID + Secret)
- **File Formats**: PNG, JPG, GIF (up to 30MB)
- **Response Format**: SVG or other vector format
- **Rate Limits**: Check Vectorizer.AI documentation for current limits

**Clipping Magic:**
- **Authentication**: HTTP Basic Authentication (API ID + Secret)
- **File Formats**: PNG, JPG, GIF (up to 30MB)
- **Response Format**: PNG with transparent background
- **Rate Limits**: Check Clipping Magic documentation for current limits

## Customization

### Branding & Colors
The website uses a custom CSS system with a customizable color scheme. To change colors:

1. **Primary Colors**: Update the `primary` color palette in `index.html`:
   ```javascript
   primary: {
       50: '#eff6ff',
       100: '#dbeafe',
       // ... customize these values
   }
   ```

2. **Logo & Branding**: Replace "Vectorizer Pro" with your brand name throughout the HTML

3. **Custom CSS**: Add your own styles in `styles.css`

### Layout Modifications
- **Hero Section**: Modify the main headline and description in the hero section
- **Features**: Update the feature cards with your own benefits
- **Footer**: Customize contact information and links

## Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

## Performance Optimizations

- **Lazy Loading**: Images are loaded only when needed
- **Debounced Events**: Prevents excessive API calls
- **Optimized Animations**: Uses CSS transforms for smooth performance
- **Minimal Dependencies**: Uses custom CSS system with no external dependencies

## Security Considerations

- **File Validation**: Client-side validation for file types and sizes
- **API Key Protection**: Store API keys securely (consider using environment variables for production)
- **CORS**: Ensure proper CORS configuration for API calls
- **Input Sanitization**: All user inputs are validated

## Deployment

### Static Hosting
The website can be deployed to any static hosting service:

- **Netlify**: Drag and drop the folder
- **Vercel**: Connect your GitHub repository
- **GitHub Pages**: Push to a GitHub repository
- **AWS S3**: Upload files to an S3 bucket

### Production Considerations
1. **HTTPS**: Always use HTTPS in production
2. **API Key Security**: Use environment variables for API keys
3. **CDN**: Consider using a CDN for better performance
4. **Monitoring**: Add analytics and error tracking

## Troubleshooting

### Common Issues

1. **API Calls Not Working**
   - Check your API key is correct
   - Verify the API endpoint URL
   - Ensure CORS is properly configured

2. **File Upload Issues**
   - Check file size limits
   - Verify supported file formats
   - Clear browser cache

3. **Styling Issues**
   - Ensure custom CSS system is loading properly
   - Check for CSS conflicts
   - Verify responsive breakpoints

### Debug Mode
Enable debug logging by adding this to the browser console:
```javascript
localStorage.setItem('debug', 'true');
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For support with:
- **Vectorizer.AI API**: Contact [vectorizer.ai](https://vectorizer.ai)
- **Website Issues**: Open an issue in this repository
- **Customization**: Check the customization section above

## Changelog

### v1.0.0
- Initial release
- Basic file upload and vectorization
- Responsive design
- Mock API integration

---

**Note**: This is a demonstration website. For production use, ensure you have proper API credentials and follow all security best practices. 