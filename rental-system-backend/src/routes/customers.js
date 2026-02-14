const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate, requireStaff } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// Get all customers
router.get('/', authenticate, requireStaff, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)

    const where = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take,
        include: {
          _count: {
            select: { rentals: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ])

    res.json({
      customers,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / take),
    })
  } catch (error) {
    console.error('Get customers error:', error)
    res.status(500).json({ error: 'Failed to fetch customers' })
  }
})

// Get single customer
router.get('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const { id } = req.params

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        rentals: {
          include: {
            item: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    // Remove financial data if user is staff
    if (req.user.role === 'STAFF') {
      customer.rentals = customer.rentals.map(rental => {
        const { dailyRate, numberOfDays, subtotal, deposit, discount, 
                totalAmount, amountPaid, amountDue, paymentStatus, ...rest } = rental
        return rest
      })
    }

    res.json(customer)
  } catch (error) {
    console.error('Get customer error:', error)
    res.status(500).json({ error: 'Failed to fetch customer' })
  }
})

// Get customer rentals
router.get('/:id/rentals', authenticate, requireStaff, async (req, res) => {
  try {
    const { id } = req.params

    const rentals = await prisma.rental.findMany({
      where: { customerId: id },
      include: {
        item: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Remove financial data if user is staff
    let response = rentals
    if (req.user.role === 'STAFF') {
      response = rentals.map(rental => {
        const { dailyRate, numberOfDays, subtotal, deposit, discount, 
                totalAmount, amountPaid, amountDue, paymentStatus, ...rest } = rental
        return rest
      })
    }

    res.json(response)
  } catch (error) {
    console.error('Get customer rentals error:', error)
    res.status(500).json({ error: 'Failed to fetch customer rentals' })
  }
})

// Create customer
router.post('/', authenticate, requireStaff, async (req, res) => {
  try {
    const { name, email, phone, address, idNumber } = req.body

    if (!name || !email || !phone) {
      return res.status(400).json({ 
        error: 'Name, email, and phone are required' 
      })
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        address,
        idNumber,
      },
    })

    res.status(201).json(customer)
  } catch (error) {
    console.error('Create customer error:', error)
    
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Customer with this email already exists' })
    }
    
    res.status(500).json({ error: 'Failed to create customer' })
  }
})

// Update customer
router.put('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, phone, address, idNumber } = req.body

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(address !== undefined && { address }),
        ...(idNumber !== undefined && { idNumber }),
      },
    })

    res.json(customer)
  } catch (error) {
    console.error('Update customer error:', error)
    
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Customer with this email already exists' })
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Customer not found' })
    }
    
    res.status(500).json({ error: 'Failed to update customer' })
  }
})

// Delete customer
router.delete('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const { id } = req.params

    // Check if customer has active rentals
    const activeRentals = await prisma.rental.count({
      where: {
        customerId: id,
        status: { in: ['PENDING', 'ACTIVE'] },
      },
    })

    if (activeRentals > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete customer with active rentals' 
      })
    }

    await prisma.customer.delete({
      where: { id },
    })

    res.json({ message: 'Customer deleted successfully' })
  } catch (error) {
    console.error('Delete customer error:', error)
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Customer not found' })
    }
    
    res.status(500).json({ error: 'Failed to delete customer' })
  }
})

module.exports = router
