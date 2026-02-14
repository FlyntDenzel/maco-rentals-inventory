# Rental Inventory Management System - Backend API

A robust Node.js backend API for rental inventory management with role-based access control. Built with Express, Prisma, and PostgreSQL.

## Features

### Role-Based Access Control
- **ADMIN**: Full access to all endpoints including financial data
- **STAFF**: Access to operational endpoints, NO access to financial data

### Core Functionality
- ✅ JWT-based authentication
- ✅ User management with roles
- ✅ Inventory management (items, categories)
- ✅ Customer management
- ✅ Rental tracking with automatic calculations
- ✅ Maintenance scheduling
- ✅ **Financial management (ADMIN ONLY)**:
  - Payment tracking
  - Expense management
  - Revenue reporting
  - Profit calculations

### Data Filtering
- Rental responses filtered based on user role
- Staff users never receive financial data
- Maintenance costs hidden from staff
- Automatic financial calculations on rental creation

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT + bcryptjs
- **Validation**: express-validator

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Database connection string

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Create a `.env` file:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/rental_inventory"
PORT=5000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

### 3. Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database with initial data
npm run prisma:seed
```

### 4. Start Development Server

```bash
npm run dev
```

API will be available at `http://localhost:5000/api`

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.js                # Seed data
├── src/
│   ├── middleware/
│   │   └── auth.js            # Authentication & authorization
│   ├── routes/
│   │   ├── auth.js            # Login, register
│   │   ├── items.js           # Inventory management
│   │   ├── categories.js      # Category management
│   │   ├── customers.js       # Customer management
│   │   ├── rentals.js         # Rental management
│   │   ├── maintenance.js     # Maintenance tracking
│   │   ├── finances.js        # Financial management (ADMIN ONLY)
│   │   └── dashboard.js       # Dashboard stats
│   └── server.js              # Express app
├── .env.example               # Environment variables template
└── package.json               # Dependencies
```

## API Documentation

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "STAFF"  // Optional, defaults to STAFF
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "user": {
    "id": "...",
    "email": "...",
    "name": "...",
    "role": "ADMIN"
  },
  "token": "eyJhbGc..."
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Items (Staff & Admin)

#### Get All Items
```http
GET /api/items?page=1&limit=10&search=drill&status=AVAILABLE&categoryId=...
Authorization: Bearer <token>
```

#### Get Single Item
```http
GET /api/items/:id
Authorization: Bearer <token>
```

#### Create Item
```http
POST /api/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Power Drill",
  "description": "Professional power drill",
  "categoryId": "...",
  "dailyRate": 15.00,
  "quantity": 5,
  "serialNumber": "PD-001",  // Optional
  "imageUrl": "..."          // Optional
}
```

#### Update Item
```http
PUT /api/items/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "status": "MAINTENANCE",
  "quantity": 3
}
```

#### Delete Item
```http
DELETE /api/items/:id
Authorization: Bearer <token>
```

### Categories (Staff & Admin)

#### Get All Categories
```http
GET /api/categories
Authorization: Bearer <token>
```

#### Create Category
```http
POST /api/categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Tools",
  "description": "Power tools and hand tools"
}
```

### Customers (Staff & Admin)

#### Get All Customers
```http
GET /api/customers?page=1&limit=10&search=john
Authorization: Bearer <token>
```

#### Create Customer
```http
POST /api/customers
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Smith",
  "email": "john@example.com",
  "phone": "(555) 123-4567",
  "address": "123 Main St",  // Optional
  "idNumber": "ID123"        // Optional
}
```

### Rentals (Staff & Admin)

**Note**: Financial data is automatically filtered for STAFF users

#### Get All Rentals
```http
GET /api/rentals?page=1&limit=10&status=ACTIVE&search=john
Authorization: Bearer <token>

// ADMIN receives full financial data
// STAFF receives rentals WITHOUT: dailyRate, numberOfDays, subtotal, deposit, 
//   discount, totalAmount, amountPaid, amountDue, paymentStatus
```

#### Create Rental
```http
POST /api/rentals
Authorization: Bearer <token>
Content-Type: application/json

{
  "customerId": "...",
  "itemId": "...",
  "startDate": "2026-02-14T00:00:00Z",
  "endDate": "2026-02-20T00:00:00Z",
  "deposit": 50,      // Optional
  "discount": 10,     // Optional
  "notes": "..."      // Optional
}

// Financial data calculated automatically:
// - dailyRate (from item)
// - numberOfDays (calculated)
// - subtotal (rate × days)
// - totalAmount (subtotal + deposit - discount)
// - amountDue (totalAmount)
```

#### Return Item
```http
PUT /api/rentals/:id/return
Authorization: Bearer <token>

// Sets returnDate, updates status to COMPLETED
// Updates item status back to AVAILABLE
```

#### Get Active Rentals
```http
GET /api/rentals/status/active
Authorization: Bearer <token>
```

#### Get Overdue Rentals
```http
GET /api/rentals/status/overdue
Authorization: Bearer <token>

// Automatically updates rentals past endDate to OVERDUE status
```

### Maintenance (Staff & Admin)

**Note**: Cost data is automatically filtered for STAFF users

#### Get All Maintenance
```http
GET /api/maintenance?page=1&status=PENDING&itemId=...
Authorization: Bearer <token>

// ADMIN receives full data including cost
// STAFF receives data WITHOUT cost field
```

#### Create Maintenance
```http
POST /api/maintenance
Authorization: Bearer <token>
Content-Type: application/json

{
  "itemId": "...",
  "description": "Replace motor",
  "cost": 150.00  // Only saved if user is ADMIN, otherwise set to 0
}

// Automatically updates item status to MAINTENANCE
```

#### Complete Maintenance
```http
PUT /api/maintenance/:id/complete
Authorization: Bearer <token>

// Sets endDate, updates status to COMPLETED
// Updates item status back to AVAILABLE
```

### Finances (ADMIN ONLY)

**All endpoints in this section require ADMIN role**

#### Get All Payments
```http
GET /api/finances/payments?page=1&startDate=2026-02-01&endDate=2026-02-28&method=CASH
Authorization: Bearer <token>
X-User-Role: ADMIN
```

#### Record Payment
```http
POST /api/finances/payments
Authorization: Bearer <token>
X-User-Role: ADMIN
Content-Type: application/json

{
  "rentalId": "...",
  "amount": 100.00,
  "paymentMethod": "CASH",  // CASH | CARD | BANK_TRANSFER | MOBILE_MONEY
  "reference": "TXN-123",    // Optional
  "notes": "..."             // Optional
}

// Automatically updates rental:
// - amountPaid += amount
// - amountDue = totalAmount - amountPaid
// - paymentStatus (UNPAID | PARTIAL | PAID)
```

#### Get All Expenses
```http
GET /api/finances/expenses?page=1&category=MAINTENANCE
Authorization: Bearer <token>
X-User-Role: ADMIN
```

#### Create Expense
```http
POST /api/finances/expenses
Authorization: Bearer <token>
X-User-Role: ADMIN
Content-Type: application/json

{
  "description": "Office rent",
  "amount": 1000.00,
  "category": "UTILITIES",  // MAINTENANCE | PROCUREMENT | SALARY | UTILITIES | OTHER
  "expenseDate": "2026-02-14T00:00:00Z",  // Optional, defaults to now
  "receipt": "...",         // Optional
  "notes": "..."            // Optional
}
```

#### Get Financial Summary
```http
GET /api/finances/summary?startDate=2026-02-01&endDate=2026-02-28
Authorization: Bearer <token>
X-User-Role: ADMIN

Response:
{
  "totalRevenue": 5000.00,
  "totalExpenses": 2000.00,
  "netProfit": 3000.00,
  "outstandingPayments": 500.00,
  "profitMargin": "60.00"
}
```

### Dashboard

#### Staff Dashboard
```http
GET /api/dashboard/staff
Authorization: Bearer <token>

Response:
{
  "totalItems": 156,
  "availableItems": 98,
  "activeRentals": 45,
  "maintenanceItems": 13
}
```

#### Admin Dashboard (ADMIN ONLY)
```http
GET /api/dashboard/admin
Authorization: Bearer <token>
X-User-Role: ADMIN

Response:
{
  "totalItems": 156,
  "availableItems": 98,
  "activeRentals": 45,
  "maintenanceItems": 13,
  "monthlyRevenue": 24350.00,
  "monthlyExpenses": 8500.00,
  "netProfit": 15850.00,
  "outstandingPayments": 3200.00
}
```

## Seeded Data

After running `npm run prisma:seed`, you'll have:

### Users
- **Admin**: admin@rental.com / admin123
- **Staff**: staff@rental.com / staff123

### Categories
- Tools
- Garden
- Construction
- Cleaning
- Electronics

### Sample Items
- Power Drill XL2000 ($15/day)
- Lawn Mower Pro ($40/day)
- Concrete Mixer ($50/day)
- Pressure Washer ($28/day)
- Ladder 20ft ($12/day)
- Chainsaw Pro ($35/day)

### Sample Customers
- John Smith
- Sarah Johnson
- Mike Wilson

## Database Schema

### Key Models

**User**
- id, email, password, name, role (ADMIN/STAFF)

**Item**
- id, name, description, categoryId, status, dailyRate, quantity

**Rental** (with financial fields)
- id, customerId, itemId, userId, dates, status
- **Financial**: dailyRate, numberOfDays, subtotal, deposit, discount, totalAmount, amountPaid, amountDue, paymentStatus

**Payment** (ADMIN ONLY access)
- id, rentalId, amount, paymentMethod, paymentDate, reference

**Expense** (ADMIN ONLY access)
- id, description, amount, category, expenseDate

**Maintenance** (cost field ADMIN ONLY)
- id, itemId, description, status, cost, dates

## Role-Based Access Matrix

| Endpoint | STAFF | ADMIN |
|----------|-------|-------|
| POST /api/auth/login | ✅ | ✅ |
| GET /api/items | ✅ | ✅ |
| POST /api/items | ✅ | ✅ |
| GET /api/rentals | ✅ (filtered) | ✅ (full) |
| POST /api/rentals | ✅ | ✅ |
| GET /api/finances/* | ❌ | ✅ |
| POST /api/finances/payments | ❌ | ✅ |
| GET /api/dashboard/admin | ❌ | ✅ |

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Admin access required"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Error message"
}
```

## Testing

### Using cURL

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rental.com","password":"admin123"}'

# Get items (with token)
curl -X GET http://localhost:5000/api/items \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using Postman/Thunder Client

1. Import the collection (if provided)
2. Set base URL: `http://localhost:5000/api`
3. Login to get token
4. Set token in Authorization header for protected routes

## Deployment

### Environment Variables

Set these in production:

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
PORT=5000
NODE_ENV=production
JWT_SECRET=very-strong-random-secret-minimum-32-characters
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-frontend-domain.com
```

### Deploy to Railway

1. Connect GitHub repository
2. Add environment variables
3. Deploy

### Deploy to Render

1. Connect repository
2. Build command: `npm install && npx prisma generate`
3. Start command: `npm start`
4. Add environment variables

### Deploy to Heroku

```bash
heroku create your-app-name
heroku addons:create heroku-postgresql:mini
git push heroku main
heroku run npm run prisma:migrate
heroku run npm run prisma:seed
```

## Security Best Practices

- ✅ All passwords hashed with bcrypt
- ✅ JWT tokens for stateless authentication
- ✅ CORS configured for specific origins
- ✅ Role-based authorization on all routes
- ✅ Financial data filtered at API level
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention via Prisma ORM
- ✅ Environment variables for secrets

## Troubleshooting

### Database Connection Failed

Check your `DATABASE_URL` in `.env`:
```bash
# Test connection
npx prisma studio
```

### Prisma Client Not Generated

```bash
npm run prisma:generate
```

### Migration Failed

```bash
# Reset database (development only!)
npx prisma migrate reset

# Then run migrations again
npm run prisma:migrate
```

### Port Already in Use

Change PORT in `.env` or kill the process:
```bash
# Find process
lsof -i :5000

# Kill process
kill -9 <PID>
```

## Scripts

```bash
# Development
npm run dev                  # Start with nodemon

# Production
npm start                    # Start server

# Database
npm run prisma:generate      # Generate Prisma Client
npm run prisma:migrate       # Run migrations
npm run prisma:studio        # Open Prisma Studio
npm run prisma:seed          # Seed database
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License

## Support

For issues or questions:
- Check existing issues
- Review documentation
- Contact support

---

**Built with ❤️ for rental businesses worldwide**
