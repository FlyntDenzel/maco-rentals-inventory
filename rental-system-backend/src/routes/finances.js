const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// ALL ROUTES IN THIS FILE ARE ADMIN ONLY

// Get all payments
router.get('/payments', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate, method } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)

    const where = {}
    
    if (startDate || endDate) {
      where.paymentDate = {}
      if (startDate) where.paymentDate.gte = new Date(startDate)
      if (endDate) where.paymentDate.lte = new Date(endDate)
    }
    
    if (method) {
      where.paymentMethod = method
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take,
        include: {
          rental: {
            include: {
              customer: true,
              item: true,
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
      }),
      prisma.payment.count({ where }),
    ])

    res.json({
      payments,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / take),
    })
  } catch (error) {
    console.error('Get payments error:', error)
    res.status(500).json({ error: 'Failed to fetch payments' })
  }
})

// Get single payment
router.get('/payments/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        rental: {
          include: {
            customer: true,
            item: true,
          },
        },
      },
    })

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' })
    }

    res.json(payment)
  } catch (error) {
    console.error('Get payment error:', error)
    res.status(500).json({ error: 'Failed to fetch payment' })
  }
})

// Record payment
router.post('/payments', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rentalId, amount, paymentMethod, reference, notes } = req.body

    if (!rentalId || !amount || !paymentMethod) {
      return res.status(400).json({ 
        error: 'Rental, amount, and payment method are required' 
      })
    }

    // Get rental
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
    })

    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' })
    }

    // Validate amount
    const paymentAmount = parseFloat(amount)
    if (paymentAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero' })
    }

    if (paymentAmount > rental.amountDue) {
      return res.status(400).json({ 
        error: `Payment amount cannot exceed amount due (${rental.amountDue})` 
      })
    }

    // Create payment and update rental
    const payment = await prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          rentalId,
          amount: paymentAmount,
          paymentMethod,
          reference,
          notes,
        },
        include: {
          rental: {
            include: {
              customer: true,
              item: true,
            },
          },
        },
      })

      // Update rental amounts
      const newAmountPaid = rental.amountPaid + paymentAmount
      const newAmountDue = rental.totalAmount - newAmountPaid

      let paymentStatus = 'UNPAID'
      if (newAmountPaid >= rental.totalAmount) {
        paymentStatus = 'PAID'
      } else if (newAmountPaid > 0) {
        paymentStatus = 'PARTIAL'
      }

      await tx.rental.update({
        where: { id: rentalId },
        data: {
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          paymentStatus,
        },
      })

      return newPayment
    })

    res.status(201).json(payment)
  } catch (error) {
    console.error('Create payment error:', error)
    res.status(500).json({ error: 'Failed to record payment' })
  }
})

// Delete payment
router.delete('/payments/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    const payment = await prisma.$transaction(async (tx) => {
      const existing = await tx.payment.findUnique({
        where: { id },
        include: { rental: true },
      })

      if (!existing) {
        throw new Error('Payment not found')
      }

      // Delete payment
      await tx.payment.delete({
        where: { id },
      })

      // Update rental amounts
      const rental = existing.rental
      const newAmountPaid = rental.amountPaid - existing.amount
      const newAmountDue = rental.totalAmount - newAmountPaid

      let paymentStatus = 'UNPAID'
      if (newAmountPaid >= rental.totalAmount) {
        paymentStatus = 'PAID'
      } else if (newAmountPaid > 0) {
        paymentStatus = 'PARTIAL'
      }

      await tx.rental.update({
        where: { id: rental.id },
        data: {
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          paymentStatus,
        },
      })

      return existing
    })

    res.json({ message: 'Payment deleted successfully', payment })
  } catch (error) {
    console.error('Delete payment error:', error)
    res.status(500).json({ error: error.message || 'Failed to delete payment' })
  }
})

// Get all expenses
router.get('/expenses', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate, category } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)

    const where = {}
    
    if (startDate || endDate) {
      where.expenseDate = {}
      if (startDate) where.expenseDate.gte = new Date(startDate)
      if (endDate) where.expenseDate.lte = new Date(endDate)
    }
    
    if (category) {
      where.category = category
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take,
        orderBy: { expenseDate: 'desc' },
      }),
      prisma.expense.count({ where }),
    ])

    res.json({
      expenses,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / take),
    })
  } catch (error) {
    console.error('Get expenses error:', error)
    res.status(500).json({ error: 'Failed to fetch expenses' })
  }
})

// Get single expense
router.get('/expenses/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    const expense = await prisma.expense.findUnique({
      where: { id },
    })

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' })
    }

    res.json(expense)
  } catch (error) {
    console.error('Get expense error:', error)
    res.status(500).json({ error: 'Failed to fetch expense' })
  }
})

// Create expense
router.post('/expenses', authenticate, requireAdmin, async (req, res) => {
  try {
    const { description, amount, category, expenseDate, receipt, notes } = req.body

    if (!description || !amount || !category) {
      return res.status(400).json({ 
        error: 'Description, amount, and category are required' 
      })
    }

    const expense = await prisma.expense.create({
      data: {
        description,
        amount: parseFloat(amount),
        category,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        receipt,
        notes,
      },
    })

    res.status(201).json(expense)
  } catch (error) {
    console.error('Create expense error:', error)
    res.status(500).json({ error: 'Failed to create expense' })
  }
})

// Update expense
router.put('/expenses/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { description, amount, category, expenseDate, receipt, notes } = req.body

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(description && { description }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(category && { category }),
        ...(expenseDate && { expenseDate: new Date(expenseDate) }),
        ...(receipt !== undefined && { receipt }),
        ...(notes !== undefined && { notes }),
      },
    })

    res.json(expense)
  } catch (error) {
    console.error('Update expense error:', error)
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Expense not found' })
    }
    
    res.status(500).json({ error: 'Failed to update expense' })
  }
})

// Delete expense
router.delete('/expenses/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    await prisma.expense.delete({
      where: { id },
    })

    res.json({ message: 'Expense deleted successfully' })
  } catch (error) {
    console.error('Delete expense error:', error)
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Expense not found' })
    }
    
    res.status(500).json({ error: 'Failed to delete expense' })
  }
})

// Get financial summary
router.get('/summary', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    const where = {}
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    // Get total revenue (all payments)
    const paymentsWhere = {}
    if (startDate || endDate) {
      paymentsWhere.paymentDate = {}
      if (startDate) paymentsWhere.paymentDate.gte = new Date(startDate)
      if (endDate) paymentsWhere.paymentDate.lte = new Date(endDate)
    }

    const payments = await prisma.payment.aggregate({
      where: paymentsWhere,
      _sum: { amount: true },
    })

    // Get total expenses
    const expensesWhere = {}
    if (startDate || endDate) {
      expensesWhere.expenseDate = {}
      if (startDate) expensesWhere.expenseDate.gte = new Date(startDate)
      if (endDate) expensesWhere.expenseDate.lte = new Date(endDate)
    }

    const expenses = await prisma.expense.aggregate({
      where: expensesWhere,
      _sum: { amount: true },
    })

    // Get outstanding payments
    const outstandingRentals = await prisma.rental.aggregate({
      where: {
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
      },
      _sum: { amountDue: true },
    })

    const totalRevenue = payments._sum.amount || 0
    const totalExpenses = expenses._sum.amount || 0
    const netProfit = totalRevenue - totalExpenses
    const outstandingPayments = outstandingRentals._sum.amountDue || 0

    res.json({
      totalRevenue,
      totalExpenses,
      netProfit,
      outstandingPayments,
      profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0,
    })
  } catch (error) {
    console.error('Get financial summary error:', error)
    res.status(500).json({ error: 'Failed to fetch financial summary' })
  }
})

// Get revenue by period
router.get('/revenue/period', authenticate, requireAdmin, async (req, res) => {
  try {
    // This would need more complex aggregation for real implementation
    // For now, return basic monthly data
    
    const payments = await prisma.payment.findMany({
      select: {
        amount: true,
        paymentDate: true,
      },
      orderBy: { paymentDate: 'desc' },
      take: 100,
    })

    res.json(payments)
  } catch (error) {
    console.error('Get revenue by period error:', error)
    res.status(500).json({ error: 'Failed to fetch revenue data' })
  }
})

module.exports = router
