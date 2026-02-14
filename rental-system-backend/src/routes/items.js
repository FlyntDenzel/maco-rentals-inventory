const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate, requireStaff } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// Get all items (with pagination and filters)
router.get('/', authenticate, requireStaff, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, categoryId } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)

    // Build where clause
    const where = {}
    
    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }
    
    if (status) {
      where.status = status
    }
    
    if (categoryId) {
      where.categoryId = categoryId
    }

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        skip,
        take,
        include: {
          category: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.item.count({ where }),
    ])

    res.json({
      items,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / take),
    })
  } catch (error) {
    console.error('Get items error:', error)
    res.status(500).json({ error: 'Failed to fetch items' })
  }
})

// Get single item
router.get('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const { id } = req.params

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        category: true,
        rentals: {
          include: {
            customer: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        maintenances: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!item) {
      return res.status(404).json({ error: 'Item not found' })
    }

    res.json(item)
  } catch (error) {
    console.error('Get item error:', error)
    res.status(500).json({ error: 'Failed to fetch item' })
  }
})

// Create item
router.post('/', authenticate, requireStaff, async (req, res) => {
  try {
    const {
      name,
      description,
      serialNumber,
      categoryId,
      dailyRate,
      quantity,
      imageUrl,
    } = req.body

    // Validate required fields
    if (!name || !categoryId || !dailyRate) {
      return res.status(400).json({ 
        error: 'Name, category, and daily rate are required' 
      })
    }

    // Validate category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    })

    if (!category) {
      return res.status(400).json({ error: 'Category not found' })
    }

    const item = await prisma.item.create({
      data: {
        name,
        description,
        serialNumber,
        categoryId,
        dailyRate: parseFloat(dailyRate),
        quantity: quantity ? parseInt(quantity) : 1,
        imageUrl,
        status: 'AVAILABLE',
      },
      include: {
        category: true,
      },
    })

    res.status(201).json(item)
  } catch (error) {
    console.error('Create item error:', error)
    
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Item with this serial number already exists' })
    }
    
    res.status(500).json({ error: 'Failed to create item' })
  }
})

// Update item
router.put('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const { id } = req.params
    const {
      name,
      description,
      serialNumber,
      categoryId,
      status,
      dailyRate,
      quantity,
      imageUrl,
    } = req.body

    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id },
    })

    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' })
    }

    // If categoryId is provided, validate it exists
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      })
      
      if (!category) {
        return res.status(400).json({ error: 'Category not found' })
      }
    }

    const item = await prisma.item.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(serialNumber !== undefined && { serialNumber }),
        ...(categoryId && { categoryId }),
        ...(status && { status }),
        ...(dailyRate && { dailyRate: parseFloat(dailyRate) }),
        ...(quantity !== undefined && { quantity: parseInt(quantity) }),
        ...(imageUrl !== undefined && { imageUrl }),
      },
      include: {
        category: true,
      },
    })

    res.json(item)
  } catch (error) {
    console.error('Update item error:', error)
    
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Item with this serial number already exists' })
    }
    
    res.status(500).json({ error: 'Failed to update item' })
  }
})

// Delete item
router.delete('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const { id } = req.params

    // Check if item has active rentals
    const activeRentals = await prisma.rental.count({
      where: {
        itemId: id,
        status: { in: ['PENDING', 'ACTIVE'] },
      },
    })

    if (activeRentals > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete item with active rentals' 
      })
    }

    await prisma.item.delete({
      where: { id },
    })

    res.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Delete item error:', error)
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Item not found' })
    }
    
    res.status(500).json({ error: 'Failed to delete item' })
  }
})

module.exports = router
