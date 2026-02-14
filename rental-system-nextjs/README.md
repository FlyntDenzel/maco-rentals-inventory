# Rental Inventory Management System - Next.js Frontend

A professional rental inventory management system built with Next.js 14, featuring role-based access control where admins manage finances and staff handle operations.

## Features

### Admin Features
- ✅ Full financial dashboard with revenue, expenses, and profit tracking
- ✅ Payment and expense management
- ✅ Financial reports and analytics
- ✅ Complete access to all operational features
- ✅ View detailed rental financial breakdowns

### Staff Features
- ✅ Operational dashboard with inventory and rental stats
- ✅ Inventory management (add, edit, delete items)
- ✅ Customer management
- ✅ Create and manage rentals (without seeing financial data)
- ✅ Maintenance tracking
- ✅ No access to financial information

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **Date Handling**: date-fns

## Prerequisites

- Node.js 18+ and npm
- Backend API running (see backend setup)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 3. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
rental-system-nextjs/
├── app/
│   ├── (auth)/
│   │   └── login/              # Login page
│   ├── admin/                  # Admin-only routes
│   │   ├── dashboard/          # Financial dashboard
│   │   ├── finances/           # Payments & expenses
│   │   ├── reports/            # Financial reports
│   │   ├── inventory/          # Inventory (admin view)
│   │   ├── customers/          # Customers (admin view)
│   │   └── rentals/            # Rentals (admin view with financials)
│   ├── staff/                  # Staff routes
│   │   ├── dashboard/          # Operational dashboard
│   │   ├── inventory/          # Inventory management
│   │   ├── customers/          # Customer management
│   │   ├── rentals/            # Rental management (no financials)
│   │   └── maintenance/        # Maintenance tracking
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page (redirects based on role)
├── components/
│   ├── layouts/
│   │   ├── AdminLayout.tsx     # Admin layout with sidebar
│   │   └── StaffLayout.tsx     # Staff layout with sidebar
│   ├── ui/                     # Reusable UI components
│   └── ProtectedRoute.tsx      # Route protection wrapper
├── lib/
│   ├── store/
│   │   └── authStore.ts        # Zustand auth store
│   ├── api.ts                  # Axios instance with interceptors
│   └── types.ts                # TypeScript interfaces
├── public/                     # Static assets
├── .env.local.example          # Environment variables template
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies
```

## Authentication

The system uses JWT-based authentication with role-based access control:

### Demo Credentials

**Admin Account:**
- Email: `admin@rental.com`
- Password: `admin123`

**Staff Account:**
- Email: `staff@rental.com`
- Password: `staff123`

### Role Permissions

| Feature | Admin | Staff |
|---------|-------|-------|
| View Dashboard | Full (with finances) | Operational only |
| Manage Inventory | ✅ | ✅ |
| Manage Customers | ✅ | ✅ |
| Create Rentals | ✅ | ✅ |
| View Rental Finances | ✅ | ❌ |
| Record Payments | ✅ | ❌ |
| Track Expenses | ✅ | ❌ |
| View Reports | ✅ | ❌ |
| Financial Analytics | ✅ | ❌ |

## Key Features Explained

### Role-Based Dashboards

**Admin Dashboard:**
- Monthly revenue, expenses, and net profit
- Outstanding payments tracking
- Complete financial overview
- Recent rentals with amounts
- Quick financial actions

**Staff Dashboard:**
- Inventory counts and availability
- Active rental statistics
- Maintenance tracking
- Recent rentals (without financial data)
- Quick operational actions

### Protected Routes

Routes are protected using the `ProtectedRoute` component:

```tsx
<ProtectedRoute requireAdmin>
  {/* Admin-only content */}
</ProtectedRoute>

<ProtectedRoute>
  {/* Staff and Admin content */}
</ProtectedRoute>
```

### API Integration

The application uses Axios with request/response interceptors:

- Automatically adds JWT token to requests
- Handles 401 (unauthorized) by redirecting to login
- Handles 403 (forbidden) appropriately
- Centralized error handling

### State Management

Zustand is used for authentication state:

```typescript
const { user, token, setAuth, logout, isAdmin, isStaff } = useAuthStore()
```

## Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import repository in Vercel
3. Add environment variable: `NEXT_PUBLIC_API_URL`
4. Deploy

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- AWS Amplify
- DigitalOcean App Platform

## Connecting to Backend

Make sure your backend API is running and accessible at the URL specified in `.env.local`.

The frontend expects these backend endpoints:

**Authentication:**
- POST `/api/auth/login`
- POST `/api/auth/register`
- GET `/api/auth/me`

**Dashboard:**
- GET `/api/dashboard/admin` (admin only)
- GET `/api/dashboard/staff`

**Inventory:**
- GET `/api/items`
- POST `/api/items`
- PUT `/api/items/:id`
- DELETE `/api/items/:id`

**Finances (Admin only):**
- GET `/api/finances/payments`
- POST `/api/finances/payments`
- GET `/api/finances/expenses`
- POST `/api/finances/expenses`

**Rentals:**
- GET `/api/rentals`
- POST `/api/rentals`
- PUT `/api/rentals/:id`

## Customization

### Branding

Update the logo and title in:
- `components/layouts/AdminLayout.tsx`
- `components/layouts/StaffLayout.tsx`
- `app/login/page.tsx`

### Colors

Modify Tailwind colors in `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: '#your-color',
    }
  }
}
```

### API URL

Change the API URL in `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api
```

## Security Considerations

- JWT tokens are stored in localStorage via Zustand persist
- All API requests include Authorization header
- Admin routes are protected at route and component level
- Financial data is never sent to staff users from backend
- Environment variables are properly prefixed with `NEXT_PUBLIC_`

## Troubleshooting

### API Connection Issues

If you can't connect to the backend:
1. Check that the backend is running
2. Verify `NEXT_PUBLIC_API_URL` in `.env.local`
3. Check browser console for CORS errors
4. Ensure backend CORS is configured to allow frontend origin

### Authentication Issues

If login fails:
1. Check credentials match backend seed data
2. Verify JWT_SECRET matches between frontend and backend
3. Check token expiration settings
4. Clear localStorage and try again

### Build Errors

If build fails:
1. Delete `.next` folder and `node_modules`
2. Run `npm install` again
3. Check for TypeScript errors with `npm run lint`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for your rental business!

## Support

For issues or questions:
- Create an issue in the repository
- Check existing documentation
- Review the roadmap for planned features

## Next Steps

After setting up the frontend:
1. Connect to your backend API
2. Test authentication flow
3. Customize branding and colors
4. Add additional features as needed
5. Deploy to production

Happy coding! 🚀
