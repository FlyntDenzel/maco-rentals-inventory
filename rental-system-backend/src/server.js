const express = require('express')
const cors = require('cors')
require('dotenv').config()

const authRoutes = require('./routes/auth')
const itemRoutes = require('./routes/items')
const categoryRoutes = require('./routes/categories')
const customerRoutes = require('./routes/customers')
const rentalRoutes = require('./routes/rentals')
const maintenanceRoutes = require('./routes/maintenance')
const financeRoutes = require('./routes/finances')
const dashboardRoutes = require('./routes/dashboard')

const app = express()

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/items', itemRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/rentals', rentalRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/finances', financeRoutes)
app.use('/api/dashboard', dashboardRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Rental Inventory API is running',
    timestamp: new Date().toISOString()
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)
  
  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(400).json({ error: 'A record with this value already exists' })
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' })
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`
🚀 Server is running on port ${PORT}
📍 API: http://localhost:${PORT}/api
🏥 Health: http://localhost:${PORT}/api/health
  `)
})

module.exports = app
