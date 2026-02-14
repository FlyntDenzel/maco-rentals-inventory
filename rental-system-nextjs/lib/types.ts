export type UserRole = 'ADMIN' | 'STAFF'

export type ItemStatus = 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'RETIRED'

export type RentalStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE'

export type MaintenanceStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED'

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MOBILE_MONEY'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Item {
  id: string
  name: string
  description?: string
  serialNumber?: string
  categoryId: string
  category?: Category
  status: ItemStatus
  dailyRate: number
  quantity: number
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address?: string
  idNumber?: string
  createdAt: string
  updatedAt: string
}

export interface Rental {
  id: string
  customerId: string
  customer?: Customer
  itemId: string
  item?: Item
  userId: string
  user?: User
  startDate: string
  endDate: string
  returnDate?: string
  status: RentalStatus
  notes?: string
  createdAt: string
  updatedAt: string
  // Financial fields (admin only)
  dailyRate?: number
  numberOfDays?: number
  subtotal?: number
  deposit?: number
  discount?: number
  totalAmount?: number
  amountPaid?: number
  amountDue?: number
  paymentStatus?: PaymentStatus
}

export interface Payment {
  id: string
  rentalId: string
  rental?: Rental
  amount: number
  paymentMethod: PaymentMethod
  paymentDate: string
  reference?: string
  notes?: string
  createdAt: string
}

export interface Expense {
  id: string
  description: string
  amount: number
  category: string
  expenseDate: string
  receipt?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Maintenance {
  id: string
  itemId: string
  item?: Item
  description: string
  status: MaintenanceStatus
  startDate: string
  endDate?: string
  cost?: number // Admin only
  createdAt: string
  updatedAt: string
}

export interface DashboardStats {
  totalItems: number
  availableItems: number
  activeRentals: number
  maintenanceItems: number
  // Admin only fields
  monthlyRevenue?: number
  monthlyExpenses?: number
  netProfit?: number
  outstandingPayments?: number
}
