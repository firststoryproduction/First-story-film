# First Story Films - Job Management System

A professional job management and commission tracking system for First Story Films production studio.

## Tech Stack

- **Frontend:** Next.js 15 (App Router)
- **Database:** Supabase PostgreSQL
- **Authentication:** NextAuth v5
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn/UI

## Features

### Admin Features
- ✅ Service Master (CRUD)
- ✅ Staff Master with service-wise commission configuration
- ✅ Vendor Master (CRUD)
- ✅ Job Management with automatic commission calculation
- ✅ Real-time job tracking and status monitoring

### Staff Features
- ✅ View assigned jobs
- ✅ Start/End job with time tracking
- ✅ Update job status
- ✅ Add final delivery location

## Setup Instructions

### 1. Clone and Install

```bash
cd first-story-films
npm install
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and execute `supabase/schema.sql`
3. Copy your project URL and anon key from Project Settings > API

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Update `.env.local` with your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Database Schema

### Models

- **User** - Admin and Staff users with role-based access
- **Service** - Service types (e.g., Teaser, Reels, Highlight)
- **StaffServiceConfig** - Service-wise commission percentages per staff
- **Vendor** - Studio/vendor information
- **Job** - Job details with time tracking and commission calculation

### Key Features

- **Automatic Commission Calculation**: `commission = (amount × percentage) / 100`
- **Time Tracking**: `startedAt` and `completedAt` timestamps
- **Role-Based Access**: Admin vs Staff permissions
- **Job Status Flow**: PENDING → IN_PROGRESS → PAUSE → COMPLETE

## Project Structure

```
first-story-films/
├── app/
│   ├── (auth)/
│   │   └── login/          # Login page
│   ├── dashboard/
│   │   ├── admin/          # Admin modules
│   │   │   ├── services/   # Service master
│   │   │   ├── staff/      # Staff master
│   │   │   ├── vendors/    # Vendor master
│   │   │   └── jobs/       # Job management
│   │   └── staff/          # Staff modules
│   │       └── my-jobs/    # Assigned jobs
│   └── api/
│       └── auth/           # NextAuth API routes
├── components/
│   ├── ui/                 # Shadcn UI components
│   └── dashboard/          # Dashboard components
├── lib/
│   ├── prisma.ts          # Prisma client
│   ├── supabase.ts        # Supabase client
│   └── auth.ts            # NextAuth configuration
└── prisma/
    └── schema.prisma      # Database schema
```

## Design System

This project follows the **First Story Films Design System**:

- **Style:** Exaggerated Minimalism
- **Colors:** Professional Blue (#0F172A) + Success Green
- **Typography:** Fira Code (headings) + Fira Sans (body)
- **Pattern:** Conversion-Optimized with Feature-Rich layout

See `design-system/first-story-films/MASTER.md` for complete guidelines.

## Development Guidelines

### Commission Calculation Logic

```typescript
const commission = (jobAmount * staffPercentage) / 100;
```

### Time Tracking

- Staff clicks "Start Job" → Sets `startedAt`, status → `IN_PROGRESS`
- Staff clicks "End Job" → Sets `completedAt`, status → `COMPLETE`
- Total time = `completedAt - startedAt`

### Access Control

- **Admin**: Full access to all modules
- **Staff**: Can only view assigned jobs, cannot see amounts/commissions

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npx prisma studio    # Open Prisma Studio (database GUI)
npx prisma db push   # Push schema changes to Supabase
```

## License

Private - First Story Films
