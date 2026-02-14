const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate, requireStaff } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// Helper function to remove cost for staff
const filterCost = (maintenance) => {
  const { cost, ...rest } = maintenance
  return rest
}

// Get all maintenance records
router.get('/', authenticate, requireStaff, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, itemId } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)

    const where = {}
    
    if (status) {
      where.status = status
    }
    
    if (itemId) {
      where.itemId = itemId
    }

    const [maintenances, total] = await Promise.all([
      prisma.maintenance.findMany({
        where,
        skip,
        take,
        include: {
          item: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.maintenance.count({ where }),
    ])

    // Filter cost for staff users
    let response = maintenances
    if (req.user.role === 'STAFF') {
      response = maintenances.map(filterCost)
    }

    res.json({
      maintenances: response,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / take),
    })
  } catch (error) {
    console.error('Get maintenances error:', error)
    res.status(500).json({ error: 'Failed to fetch maintenance records' })
  }
})

// Get single maintenance record
router.get('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const { id } = req.params

    const maintenance = await prisma.maintenance.findUnique({
      where: { id },
      include: {
        item: true,
      },
    })

    if (!maintenance) {
      return res.status(404).json({ error: 'Maintenance record not found' })
    }

    // Filter cost for staff users
    let response = maintenance
    if (req.user.role === 'STAFF') {
      response = filterCost(maintenance)
    }

    res.json(response)
  } catch (error) {
    console.error('Get maintenance error:', error)
    res.status(500).json({ error: 'Failed to fetch maintenance record' })
  }
})

// Create maintenance record
router.post('/', authenticate, requireStaff, async (req, res) => {
  try {
    const { itemId, description, cost = 0 } = req.body

    if (!itemId || !description) {
      return res.status(400).json({ 
        error: 'Item and description are required' 
      })
    }

    // Validate item exists
    const item = await prisma.item.findUnique({
      where: { id: itemId },
    })

    if (!item) {
      return res.status(404).json({ error: 'Item not found' })
    }

    // Create maintenance and update item status
    const maintenance = await prisma.$transaction(async (tx) => {
      const newMaintenance = await tx.maintenance.create({
        data: {
          itemId,
          description,
          cost: req.user.role === 'ADMIN' ? parseFloat(cost) : 0,
          status: 'PENDING',
        },
        include: {
          item: true,
        },
      })

      // Update item status
      await tx.item.update({
        where: { id: itemId },
        data: { status: 'MAINTENANCE' },
      })

      return newMaintenance
    })

    // Filter cost for staff users
    let response = maintenance
    if (req.user.role === 'STAFF') {
      response = filterCost(maintenance)
    }

    res.status(201).json(response)
  } catch (error) {
    console.error('Create maintenance error:', error)
    res.status(500).json({ error: 'Failed to create maintenance record' })
  }
})

// Update maintenance record
router.put('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const { id } = req.params
    const { description, status, cost } = req.body

    // Build update data based on role
    const updateData = {}
    
    if (description) updateData.description = description
    if (status) updateData.status = status
    
    // Only admin can update cost
    if (cost !== undefined && req.user.role === 'ADMIN') {
      updateData.cost = parseFloat(cost)
    }

    const maintenance = await prisma.maintenance.update({
      where: { id },
      data: updateData,
      include: {
        item: true,
      },
    })

    // Filter cost for staff users
    let response = maintenance
    if (req.user.role === 'STAFF') {
      response = filterCost(maintenance)
    }

    res.json(response)
  } catch (error) {
    console.error('Update maintenance error:', error)
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Maintenance record not found' })
    }
    
    res.status(500).json({ error: 'Failed to update maintenance record' })
  }
})

// Complete maintenance
router.put('/:id/complete', authenticate, requireStaff, async (req, res) => {
  try {
    const { id } = req.params

    const maintenance = await prisma.$transaction(async (tx) => {
      const existing = await tx.maintenance.findUnique({
        where: { id },
        include: { item: true },
      })

      if (!existing) {
        throw new Error('Maintenance record not found')
      }

      if (existing.status === 'COMPLETED') {
        throw new Error('Maintenance already completed')
      }

      // Update maintenance
      const updated = await tx.maintenance.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          endDate: new Date(),
        },
        include: {
          item: true,
        },
      })

      // Update item status back to available
      await tx.item.update({
        where: { id: existing.itemId },
        data: { status: 'AVAILABLE' },
      })

      return updated
    })

    // Filter cost for staff users
    let response = maintenance
    if (req.user.role === 'STAFF') {
      response = filterCost(maintenance)
    }

    res.json(response)
  } catch (error) {
    console.error('Complete maintenance error:', error)
    res.status(500).json({ error: error.message || 'Failed to complete maintenance' })
  }
})

// Delete maintenance record
router.delete('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const { id } = req.params

    await prisma.maintenance.delete({
      where: { id },
    })

    res.json({ message: 'Maintenance record deleted successfully' })
  } catch (error) {
    console.error('Delete maintenance error:', error)
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Maintenance record not found' })
    }
    
    res.status(500).json({ error: 'Failed to delete maintenance record' })
  }
})

module.exports = router
