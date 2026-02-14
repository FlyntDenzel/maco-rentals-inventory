const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate, requireStaff } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// Get all categories
router.get('/', authenticate, requireStaff, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    res.json(categories)
  } catch (error) {
    console.error('Get categories error:', error)
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

// Get single category
router.get('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const { id } = req.params

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        items: true,
      },
    })

    if (!category) {
      return res.status(404).json({ error: 'Category not found' })
    }

    res.json(category)
  } catch (error) {
    console.error('Get category error:', error)
    res.status(500).json({ error: 'Failed to fetch category' })
  }
})

// Create category
router.post('/', authenticate, requireStaff, async (req, res) => {
  try {
    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' })
    }

    const category = await prisma.category.create({
      data: {
        name,
        description,
      },
    })

    res.status(201).json(category)
  } catch (error) {
    console.error('Create category error:', error)
    
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Category with this name already exists' })
    }
    
    res.status(500).json({ error: 'Failed to create category' })
  }
})

// Update category
router.put('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const { id } = req.params
    const { name, description } = req.body

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    })

    res.json(category)
  } catch (error) {
    console.error('Update category error:', error)
    
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Category with this name already exists' })
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' })
    }
    
    res.status(500).json({ error: 'Failed to update category' })
  }
})

// Delete category
router.delete('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const { id } = req.params

    // Check if category has items
    const itemCount = await prisma.item.count({
      where: { categoryId: id },
    })

    if (itemCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category with ${itemCount} item(s)` 
      })
    }

    await prisma.category.delete({
      where: { id },
    })

    res.json({ message: 'Category deleted successfully' })
  } catch (error) {
    console.error('Delete category error:', error)
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' })
    }
    
    res.status(500).json({ error: 'Failed to delete category' })
  }
})

module.exports = router
