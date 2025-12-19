# Cycle Runner - Phase 1 MVP

Automated testing platform for running Playwright tests on-demand.

## 🚀 Tech Stack

- **Frontend/Backend**: Next.js 14 + TypeScript
- **Database**: Supabase (Postgres)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (Phase 1) → S3 + CloudFront (Phase 2)
- **Test Runner**: Fly.io (Docker containers)
- **Testing**: Playwright
- **Hosting**: Vercel

## 📋 Phase 1 Features

- ✅ Email/password authentication
- ✅ Dashboard to view test suites
- ✅ Create and manage test suites
- ✅ Trigger test runs manually
- ✅ View test results (pass/fail, duration)
- ✅ Screenshots display
- ✅ Test run history

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings → API
3. Copy your project URL and anon key
4. Run the migration script:
   - Go to SQL Editor in Supabase dashboard
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Run the SQL

### 3. Configure Environment Variables

Create `.env.local` file:

```bash
cp .env.example .env.local
```

Fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Fly.io (set up later)
FLY_API_TOKEN=your-fly-token
FLY_APP_NAME=cycle-runner

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Create Your First User

1. You'll need to manually create a user in Supabase:
   - Go to Authentication → Users
   - Click "Add user" → "Create new user"
   - Enter email and password
   - Or use the signup form if you add a signup page

### 6. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Follow the prompts and add your environment variables in Vercel dashboard.

## 🐳 Setting Up Fly.io Test Runner (Optional for Phase 1)

### 1. Install Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
```

### 2. Login to Fly.io

```bash
fly auth login
```

### 3. Deploy the Runner

```bash
cd playwright-runner
fly launch
# Follow prompts, use suggested app name or customize

# Deploy
fly deploy
```

### 4. Set Environment Variables

```bash
fly secrets set \
  API_WEBHOOK_URL=https://your-app.vercel.app/api/webhook \
  SUPABASE_URL=your-supabase-url \
  SUPABASE_KEY=your-service-role-key
```

## 📁 Project Structure

```
cycle-runner-app/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Protected dashboard pages
│   ├── login/             # Auth pages
│   └── page.tsx           # Landing page
├── components/            # React components
├── lib/                   # Utilities
│   └── supabase/          # Supabase client/server
├── playwright-runner/     # Fly.io test runner
│   ├── Dockerfile
│   ├── run-tests.js
│   └── tests/             # Example tests
└── supabase/
    └── migrations/        # Database schema
```

## 🔒 Database Schema

- **profiles**: User profile data (extends auth.users)
- **test_suites**: Test suite configurations
- **test_runs**: Individual test execution records
- **usage_tracking**: Monthly usage stats (for billing)

## 🎯 Next Steps (Phase 2)

- [ ] Add video recording
- [ ] Migrate to AWS S3 + CloudFront
- [ ] Email notifications via Resend
- [ ] Better error handling
- [ ] Loading states and real-time updates

## 📝 Notes

- Phase 1 uses simulated test execution in development
- Fly.io integration is simplified (to be completed)
- Storage uses Supabase Storage (migrate to S3 in Phase 2)
- No usage limits or billing yet

## 🤝 Support

For questions or issues, contact: scott@cyclerunner.com

## 📄 License

Private - All Rights Reserved

// 