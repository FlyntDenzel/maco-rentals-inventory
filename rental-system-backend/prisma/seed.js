const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create Admin User
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rental.com' },
    update: {},
    create: {
      email: 'admin@rental.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  })
  console.log('✅ Created admin user:', admin.email)

  // Create Staff User
  const staffPassword = await bcrypt.hash('staff123', 10)
  const staff = await prisma.user.upsert({
    where: { email: 'staff@rental.com' },
    update: {},
    create: {
      email: 'staff@rental.com',
      password: staffPassword,
      name: 'Staff User',
      role: 'STAFF',
    },
  })
  console.log('✅ Created staff user:', staff.email)

  // Create Categories
  const categories = [
    { name: 'Tools', description: 'Power tools and hand tools' },
    { name: 'Garden', description: 'Lawn and garden equipment' },
    { name: 'Construction', description: 'Heavy construction equipment' },
    { name: 'Cleaning', description: 'Cleaning equipment and supplies' },
    { name: 'Electronics', description: 'Electronic equipment' },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })
  }
  console.log('✅ Created categories')

  // Get category IDs
  const toolsCategory = await prisma.category.findUnique({ where: { name: 'Tools' } })
  const gardenCategory = await prisma.category.findUnique({ where: { name: 'Garden' } })
  const constructionCategory = await prisma.category.findUnique({ where: { name: 'Construction' } })
  const cleaningCategory = await prisma.category.findUnique({ where: { name: 'Cleaning' } })

  // Create Sample Items
  const items = [
    {
      name: 'Power Drill XL2000',
      description: 'Professional cordless power drill with battery',
      categoryId: toolsCategory.id,
      dailyRate: 15.00,
      quantity: 5,
      status: 'AVAILABLE',
    },
    {
      name: 'Lawn Mower Pro',
      description: 'Self-propelled gas lawn mower',
      categoryId: gardenCategory.id,
      dailyRate: 40.00,
      quantity: 3,
      status: 'AVAILABLE',
    },
    {
      name: 'Concrete Mixer',
      description: 'Portable electric concrete mixer',
      categoryId: constructionCategory.id,
      dailyRate: 50.00,
      quantity: 2,
      status: 'AVAILABLE',
    },
    {
      name: 'Pressure Washer',
      description: '3000 PSI electric pressure washer',
      categoryId: cleaningCategory.id,
      dailyRate: 28.00,
      quantity: 4,
      status: 'AVAILABLE',
    },
    {
      name: 'Ladder 20ft',
      description: 'Extension ladder, aluminum',
      categoryId: toolsCategory.id,
      dailyRate: 12.00,
      quantity: 8,
      status: 'AVAILABLE',
    },
    {
      name: 'Chainsaw Pro',
      description: 'Gas-powered chainsaw with safety gear',
      categoryId: toolsCategory.id,
      dailyRate: 35.00,
      quantity: 6,
      status: 'AVAILABLE',
    },
  ]

  for (const item of items) {
    await prisma.item.create({ data: item })
  }
  console.log('✅ Created sample items')

  // Create Sample Customers
  const customers = [
    {
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '(555) 123-4567',
      address: '123 Main St, Anytown, ST 12345',
    },
    {
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      phone: '(555) 234-5678',
      address: '456 Oak Ave, Somewhere, ST 23456',
    },
    {
      name: 'Mike Wilson',
      email: 'mike.wilson@email.com',
      phone: '(555) 345-6789',
      address: '789 Pine Rd, Elsewhere, ST 34567',
    },
  ]

  for (const customer of customers) {
    await prisma.customer.create({ data: customer })
  }
  console.log('✅ Created sample customers')

  console.log('🎉 Database seeding completed!')
  console.log('\n📝 Login Credentials:')
  console.log('   Admin: admin@rental.com / admin123')
  console.log('   Staff: staff@rental.com / staff123')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
