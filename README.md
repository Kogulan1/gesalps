# Gesalps - Synthetic Data Generation Platform

A comprehensive platform for generating synthetic datasets with privacy-preserving techniques, built with Next.js, FastAPI, and Supabase.

## 🚀 Overview

Gesalps is a modern web application that enables users to create, manage, and generate synthetic datasets while maintaining data privacy. The platform provides an intuitive interface for data scientists, researchers, and organizations to work with sensitive data safely.

## ✨ Key Features

### 🔐 Authentication & Security
- **Multi-provider Authentication**: Email/password, OAuth (Google, GitHub), magic links
- **Password Security**: Strength validation, forgot/reset password functionality
- **JWT-based API Security**: Secure backend communication with Supabase JWT
- **Row Level Security (RLS)**: Database-level access control

### 📊 Data Management
- **Project Organization**: Create and manage multiple data projects
- **Dataset Upload**: Support for CSV file uploads with automatic schema detection
- **Data Preview**: Built-in CSV preview and validation
- **File Management**: Secure file storage with Supabase Storage

### 🤖 Synthetic Data Generation
- **Multiple Generation Methods**: Various algorithms for synthetic data creation
- **Privacy-Preserving Techniques**: Differential privacy and other privacy methods
- **Background Processing**: Asynchronous run execution with real-time status updates
- **Metrics & Analytics**: Comprehensive metrics for generated datasets

### 🎨 Modern UI/UX
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark/Light Theme**: Theme switching with system preference detection
- **Internationalization**: Multi-language support (EN, DE, FR, IT)
- **Grid/List Views**: Optimized layouts for different screen sizes
- **Real-time Updates**: Live status updates and progress tracking

## 🏗️ Architecture

### Frontend (Next.js 15)
- **Framework**: Next.js with App Router
- **Styling**: Tailwind CSS v4 with custom design system
- **UI Components**: Radix UI primitives with shadcn-style components
- **State Management**: React hooks and context
- **Authentication**: Supabase Auth with SSR support
- **Internationalization**: next-intl for multi-language support

### Backend (FastAPI)
- **API Framework**: FastAPI with automatic OpenAPI documentation
- **Authentication**: JWT verification with Supabase
- **File Processing**: Multipart file uploads with validation
- **Background Workers**: Asynchronous task processing
- **Storage**: Supabase Storage for file management

### Database (Supabase)
- **PostgreSQL**: Primary database with RLS policies
- **Storage**: File storage with access controls
- **Real-time**: WebSocket connections for live updates
- **Auth**: Built-in authentication and user management

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- Supabase account (free tier available)

### 1. Clone the Repository
```bash
git clone https://github.com/Kogulan1/gesalps.git
cd gesalps
```

### 2. Set Up Supabase
1. Create a new Supabase project
2. Go to Project Settings → API and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Enable Email authentication in Authentication → Providers
4. Apply the database schema (see Backend Setup)

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_BACKEND_API_BASE=http://localhost:8000
```

Start the development server:
```bash
npm run dev
```

### 4. Backend Setup
```bash
cd backend
pip install -r requirements.txt
```

Create `.env`:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CORS_ALLOW_ORIGINS=http://localhost:3000
WORKER_ENABLED=true
```

Apply database schema:
```bash
supabase link --project-ref your-project-ref
bash scripts/apply_schema.sh
```

Start the backend:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 📁 Project Structure

```
gesalps/
├── frontend/                 # Next.js frontend application
│   ├── app/                 # App Router pages and layouts
│   ├── components/          # React components
│   │   ├── dashboard/       # Dashboard-specific components
│   │   ├── datasets/        # Dataset management components
│   │   ├── projects/        # Project management components
│   │   ├── runs/           # Run execution components
│   │   └── ui/             # Reusable UI components
│   ├── lib/                # Utility functions and configurations
│   └── messages/           # Internationalization files
├── backend/                # FastAPI backend application
│   ├── api/               # Main API application
│   ├── synth_worker/      # Background worker for data generation
│   ├── report_service/    # Report generation service
│   ├── sql/              # Database schema and migrations
│   └── scripts/          # Utility scripts
└── api/                   # Additional API services
```

## 🔧 Configuration

### Environment Variables

#### Frontend (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_BACKEND_API_BASE=your_backend_url
```

#### Backend (.env)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
CORS_ALLOW_ORIGINS=http://localhost:3000,https://yourdomain.com
WORKER_ENABLED=true
ALLOW_INSECURE_SUPABASE_DEFAULTS=false
```

## 🚀 Deployment

### Frontend (Vercel)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel settings
4. Deploy automatically

### Backend (Railway/Render)
1. Connect GitHub repository
2. Set environment variables
3. Deploy with automatic builds

### Database (Supabase)
- Production database is managed by Supabase
- Apply schema using the provided SQL scripts
- Configure RLS policies for security

## 🧪 Testing

### Frontend Testing
```bash
cd frontend
npm run lint
npm run build
```

### Backend Testing
```bash
cd backend
python -m pytest tests/
```

## 📚 API Documentation

### Authentication
All API endpoints require JWT authentication via Supabase.

### Core Endpoints
- `GET /health` - Health check
- `POST /v1/projects` - Create new project
- `POST /v1/datasets/upload` - Upload dataset file
- `POST /v1/runs` - Start synthetic data generation
- `GET /v1/runs/{id}/status` - Get run status
- `GET /v1/runs/{id}/metrics` - Get generation metrics
- `GET /v1/runs/{id}/artifacts` - Download generated files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the individual README files in each directory
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions and community support

## 🔮 Roadmap

- [ ] Advanced privacy metrics and validation
- [ ] More synthetic data generation algorithms
- [ ] Real-time collaboration features
- [ ] API rate limiting and usage analytics
- [ ] Advanced data visualization tools
- [ ] Integration with popular ML frameworks

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [Supabase](https://supabase.com/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)

---

**Gesalps** - Generating synthetic data with privacy at its core. 🛡️📊
