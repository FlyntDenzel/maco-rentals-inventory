const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate, requireAdmin, requireStaff } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// Get staff dashboard stats (available to all authenticated users)
router.get('/staff', authenticate, requireStaff, async (req, res) => {
  try {
    const [
      totalItems,
      availableItems,
      activeRentals,
      maintenanceItems,
    ] = await Promise.all([
      prisma.item.count(),
      prisma.item.count({ where: { status: 'AVAILABLE' } }),
      prisma.rental.count({ where: { status: 'ACTIVE' } }),
      prisma.item.count({ where: { status: 'MAINTENANCE' } }),
    ])

    res.json({
      totalItems,
      availableItems,
      activeRentals,
      maintenanceItems,
    })
  } catch (error) {
    console.error('Get staff dashboard error:', error)
    res.status(500).json({ error: 'Failed to fetch dashboard stats' })
  }
})

// Get admin dashboard stats (ADMIN ONLY - includes financial data)
router.get('/admin', authenticate, requireAdmin, async (req, res) => {
  try {
    // Get current month date range
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const [
      totalItems,
      availableItems,
      activeRentals,
      maintenanceItems,
      monthlyPayments,
      monthlyExpenses,
      outstandingRentals,
    ] = await Promise.all([
      prisma.item.count(),
      prisma.item.count({ where: { status: 'AVAILABLE' } }),
      prisma.rental.count({ where: { status: 'ACTIVE' } }),
      prisma.item.count({ where: { status: 'MAINTENANCE' } }),
      prisma.payment.aggregate({
        where: {
          paymentDate: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          expenseDate: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
        _sum: { amount: true },
      }),
      prisma.rental.aggregate({
        where: {
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        },
        _sum: { amountDue: true },
      }),
    ])

    const monthlyRevenue = monthlyPayments._sum.amount || 0
    const monthlyExpensesTotal = monthlyExpenses._sum.amount || 0
    const netProfit = monthlyRevenue - monthlyExpensesTotal
    const outstandingPayments = outstandingRentals._sum.amountDue || 0

    res.json({
      totalItems,
      availableItems,
      activeRentals,
      maintenanceItems,
      monthlyRevenue,
      monthlyExpenses: monthlyExpensesTotal,
      netProfit,
      outstandingPayments,
    })
  } catch (error) {
    console.error('Get admin dashboard error:', error)
    res.status(500).json({ error: 'Failed to fetch admin dashboard stats' })
  }
})

// Get recent activity (rentals)
router.get('/activity', authenticate, requireStaff, async (req, res) => {
  try {
    const recentRentals = await prisma.rental.findMany({
      take: 10,
      include: {
        customer: true,
        item: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Filter financial data for staff users
    let response = recentRentals
    if (req.user.role === 'STAFF') {
      response = recentRentals.map(rental => {
        const { dailyRate, numberOfDays, subtotal, deposit, discount, 
                totalAmount, amountPaid, amountDue, paymentStatus, ...rest } = rental
        return rest
      })
    }

    res.json(response)
  } catch (error) {
    console.error('Get activity error:', error)
    res.status(500).json({ error: 'Failed to fetch recent activity' })
  }
})

// Get low stock items
router.get('/low-stock', authenticate, requireStaff, async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 5

    const lowStockItems = await prisma.item.findMany({
      where: {
        quantity: { lte: threshold },
        status: { not: 'RETIRED' },
      },
      include: {
        category: true,
      },
      orderBy: { quantity: 'asc' },
    })

    res.json(lowStockItems)
  } catch (error) {
    console.error('Get low stock error:', error)
    res.status(500).json({ error: 'Failed to fetch low stock items' })
  }
})

module.exports = router
