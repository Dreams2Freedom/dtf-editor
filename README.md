# DTF Editor 🎨

A mobile-first, user-friendly web application that helps hobbyists and small home businesses create print-ready DTF files through AI-powered image processing tools.

## 🚀 Features

- **Image Upscaling** - Improve poor-quality images with AI
- **Background Removal** - Create transparent backgrounds automatically
- **Image Vectorization** - Convert raster images to vector format
- **AI Image Generation** - Create DTF-ready images with transparent backgrounds (paid plans)
  - **Guided Mode:** Conversational chat interface for building optimized prompts
  - **Upload Image Mode:** Analyze and recreate existing designs with modifications
- **Credit System** - Pay-as-you-go or subscription-based usage
- **Mobile-First Design** - Optimized for all devices
- **Real-time Processing** - Live status updates and progress tracking

## 🛠️ Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript
- **Styling:** Tailwind CSS with custom design system
- **State Management:** Zustand + React Context
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Payments:** Stripe
- **AI Services:** OpenAI, Deep-Image.ai, ClippingMagic, Vectorizer.ai
- **Testing:** Vitest + React Testing Library
- **Deployment:** Vercel

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Stripe account
- AI service API keys (OpenAI, Deep-Image.ai, ClippingMagic, Vectorizer.ai)

## 🚀 Quick Start

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd dtf-editor
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env.local
   ```

   Fill in your environment variables (see [Environment Setup Guide](./ENVIRONMENT_SETUP_GUIDE.md))

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Type checking
npm run type-check
```

## 🎨 Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Format code
npm run format

# Check formatting
npm run format:check
```

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # React components
│   ├── ui/             # Base UI components
│   ├── layout/         # Layout components
│   ├── auth/           # Authentication components
│   ├── image/          # Image processing components
│   ├── gallery/        # Gallery components
│   ├── payment/        # Payment components
│   ├── admin/          # Admin dashboard components
│   └── feedback/       # Toast, loading, error components
├── hooks/              # Custom React hooks
├── services/           # API service layer
├── stores/             # Zustand state stores
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── constants/          # App constants
├── config/             # Configuration files
├── styles/             # Global styles
└── test/               # Test setup and utilities
```

## 🎯 Development Roadmap

See [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) for detailed development phases and tasks.

## 📚 Documentation

- [Product Requirements Document](./DTF_EDITOR_PRD.md)
- [System Architecture](./SYSTEM_ARCHITECTURE.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Environment Setup Guide](./ENVIRONMENT_SETUP_GUIDE.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support, email support@dtfeditor.com or create an issue in the repository.

---

**Built with ❤️ for the DTF printing community**
