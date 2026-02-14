const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate, requireStaff } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// Helper function to remove financial data for staff
const filterFinancialData = (rental) => {
  const { dailyRate, numberOfDays, subtotal, deposit, discount, 
          totalAmount, amountPaid, amountDue, paymentStatus, payments, ...rest } = rental
  return rest
}

// Get all rentals
router.get('/', authenticate, requireStaff, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)

    const where = {}
    
    if (status && status !== 'ALL') {
      where.status = status
    }
    
    if (search) {
      where.OR = [
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { item: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [rentals, total] = await Promise.all([
      prisma.rental.findMany({
        where,
        skip,
        take,
        include: {
          customer: true,
          item: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.rental.count({ where }),
    ])

    // Filter financial data for staff users
    let response = rentals
    if (req.user.role === 'STAFF') {
      response = rentals.map(filterFinancialData)
    }

    res.json({
      rentals: response,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / take),
    })
  } catch (error) {
    console.error('Get rentals error:', error)
    res.status(500).json({ error: 'Failed to fetch rentals' })
  }
})

// Get single rental
router.get('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const { id } = req.params

    const rental = await prisma.rental.findUnique({
      where: { id },
      include: {
        customer: true,
        item: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        payments: req.user.role === 'ADMIN',
      },
    })

    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' })
    }

    // Filter financial data for staff users
    let response = rental
    if (req.user.role === 'STAFF') {
      response = filterFinancialData(rental)
    }

    res.json(response)
  } catch (error) {
    console.error('Get rental error:', error)
    res.status(500).json({ error: 'Failed to fetch rental' })
  }
})

// Create rental
router.post('/', authenticate, requireStaff, async (req, res) => {
  try {
    const { customerId, itemId, startDate, endDate, deposit = 0, discount = 0, notes } = req.body

    // Validate required fields
    if (!customerId || !itemId || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Customer, item, start date, and end date are required' 
      })
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (end <= start) {
      return res.status(400).json({ error: 'End date must be after start date' })
    }

    // Get item and validate availability
    const item = await prisma.item.findUnique({
      where: { id: itemId },
    })

    if (!item) {
      return res.status(404).json({ error: 'Item not found' })
    }

    if (item.status !== 'AVAILABLE' || item.quantity < 1) {
      return res.status(400).json({ error: 'Item is not available for rental' })
    }

    // Validate customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    // Calculate rental financials
    const numberOfDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    const subtotal = item.dailyRate * numberOfDays
    const totalAmount = subtotal + parseFloat(deposit) - parseFloat(discount)
    const amountDue = totalAmount

    // Create rental in a transaction
    const rental = await prisma.$transaction(async (tx) => {
      // Create rental
      const newRental = await tx.rental.create({
        data: {
          customerId,
          itemId,
          userId: req.user.id,
          startDate: start,
          endDate: end,
          status: 'PENDING',
          notes,
          dailyRate: item.dailyRate,
          numberOfDays,
          subtotal,
          deposit: parseFloat(deposit),
          discount: parseFloat(discount),
          totalAmount,
          amountPaid: 0,
          amountDue,
          paymentStatus: 'UNPAID',
        },
        include: {
          customer: true,
          item: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      })

      // Update item status and quantity
      await tx.item.update({
        where: { id: itemId },
        data: {
          status: 'RENTED',
          quantity: { decrement: 1 },
        },
      })

      return newRental
    })

    // Filter financial data for staff users
    let response = rental
    if (req.user.role === 'STAFF') {
      response = filterFinancialData(rental)
    }

    res.status(201).json(response)
  } catch (error) {
    console.error('Create rental error:', error)
    res.status(500).json({ error: 'Failed to create rental' })
  }
})

// Update rental
router.put('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const { id } = req.params
    const { startDate, endDate, status, notes } = req.body

    const existingRental = await prisma.rental.findUnique({
      where: { id },
      include: { item: true },
    })

    if (!existingRental) {
      return res.status(404).json({ error: 'Rental not found' })
    }

    // Recalculate if dates changed
    let updates = {}
    
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : existingRental.startDate
      const end = endDate ? new Date(endDate) : existingRental.endDate
      
      if (end <= start) {
        return res.status(400).json({ error: 'End date must be after start date' })
      }

      const numberOfDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
      const subtotal = existingRental.dailyRate * numberOfDays
      const totalAmount = subtotal + existingRental.deposit - existingRental.discount
      const amountDue = totalAmount - existingRental.amountPaid

      updates = {
        startDate: start,
        endDate: end,
        numberOfDays,
        subtotal,
        totalAmount,
        amountDue,
      }
    }

    const rental = await prisma.rental.update({
      where: { id },
      data: {
        ...updates,
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        customer: true,
        item: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    // Filter financial data for staff users
    let response = rental
    if (req.user.role === 'STAFF') {
      response = filterFinancialData(rental)
    }

    res.json(response)
  } catch (error) {
    console.error('Update rental error:', error)
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Rental not found' })
    }
    
    res.status(500).json({ error: 'Failed to update rental' })
  }
})

// Return item
router.put('/:id/return', authenticate, requireStaff, async (req, res) => {
  try {
    const { id } = req.params

    const rental = await prisma.$transaction(async (tx) => {
      const existingRental = await tx.rental.findUnique({
        where: { id },
        include: { item: true },
      })

      if (!existingRental) {
        throw new Error('Rental not found')
      }

      if (existingRental.status === 'COMPLETED') {
        throw new Error('Rental already completed')
      }

      // Update rental
      const updatedRental = await tx.rental.update({
        where: { id },
        data: {
          returnDate: new Date(),
          status: 'COMPLETED',
        },
        include: {
          customer: true,
          item: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      })

      // Update item
      await tx.item.update({
        where: { id: existingRental.itemId },
        data: {
          status: 'AVAILABLE',
          quantity: { increment: 1 },
        },
      })

      return updatedRental
    })

    // Filter financial data for staff users
    let response = rental
    if (req.user.role === 'STAFF') {
      response = filterFinancialData(rental)
    }

    res.json(response)
  } catch (error) {
    console.error('Return item error:', error)
    res.status(500).json({ error: error.message || 'Failed to return item' })
  }
})

// Get active rentals
router.get('/status/active', authenticate, requireStaff, async (req, res) => {
  try {
    const rentals = await prisma.rental.findMany({
      where: { status: 'ACTIVE' },
      include: {
        customer: true,
        item: true,
      },
      orderBy: { endDate: 'asc' },
    })

    // Filter financial data for staff users
    let response = rentals
    if (req.user.role === 'STAFF') {
      response = rentals.map(filterFinancialData)
    }

    res.json(response)
  } catch (error) {
    console.error('Get active rentals error:', error)
    res.status(500).json({ error: 'Failed to fetch active rentals' })
  }
})

// Get overdue rentals
router.get('/status/overdue', authenticate, requireStaff, async (req, res) => {
  try {
    const today = new Date()
    
    // Update overdue rentals
    await prisma.rental.updateMany({
      where: {
        status: 'ACTIVE',
        endDate: { lt: today },
      },
      data: {
        status: 'OVERDUE',
      },
    })

    const rentals = await prisma.rental.findMany({
      where: { status: 'OVERDUE' },
      include: {
        customer: true,
        item: true,
      },
      orderBy: { endDate: 'asc' },
    })

    // Filter financial data for staff users
    let response = rentals
    if (req.user.role === 'STAFF') {
      response = rentals.map(filterFinancialData)
    }

    res.json(response)
  } catch (error) {
    console.error('Get overdue rentals error:', error)
    res.status(500).json({ error: 'Failed to fetch overdue rentals' })
  }
})

module.exports = router
