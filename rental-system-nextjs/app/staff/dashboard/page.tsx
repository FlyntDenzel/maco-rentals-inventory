'use client'

import { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import StaffLayout from '@/components/layouts/StaffLayout'
import api from '@/lib/api'
import { DashboardStats, Rental } from '@/lib/types'
import { Package, FileText, Wrench, CheckCircle } from 'lucide-react'

export default function StaffDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentRentals, setRecentRentals] = useState<Rental[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsRes, rentalsRes] = await Promise.all([
        api.get('/dashboard/staff'),
        api.get('/rentals?limit=5')
      ])
      setStats(statsRes.data)
      setRecentRentals(rentalsRes.data.rentals || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`${color}`}>
          <Icon size={40} />
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <ProtectedRoute>
        <StaffLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </StaffLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <StaffLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
            <p className="text-gray-600">Operational overview and quick actions</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Items"
              value={stats?.totalItems || 0}
              subtitle="+12 this month"
              icon={Package}
              color="text-blue-600"
            />
            <StatCard
              title="Available"
              value={stats?.availableItems || 0}
              subtitle={`${stats?.activeRentals || 0} rented`}
              icon={CheckCircle}
              color="text-green-600"
            />
            <StatCard
              title="Active Rentals"
              value={stats?.activeRentals || 0}
              subtitle="3 overdue"
              icon={FileText}
              color="text-purple-600"
            />
            <StatCard
              title="Maintenance"
              value={stats?.maintenanceItems || 0}
              subtitle="Items in service"
              icon={Wrench}
              color="text-orange-600"
            />
          </div>

          {/* Recent Rentals - NO FINANCIAL DATA */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold mb-4">Recent Rentals</h3>
            <div className="space-y-3">
              {recentRentals.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No recent rentals</p>
              ) : (
                recentRentals.map((rental) => (
                  <div
                    key={rental.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {rental.customer?.name || 'Unknown Customer'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {rental.item?.name || 'Unknown Item'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          rental.status === 'ACTIVE'
                            ? 'bg-blue-100 text-blue-700'
                            : rental.status === 'OVERDUE'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {rental.status}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
                        Due: {new Date(rental.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">➕</div>
                <p className="font-medium text-blue-900">New Rental</p>
                <p className="text-xs text-blue-600">Create rental</p>
              </button>
              <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📦</div>
                <p className="font-medium text-green-900">Add Item</p>
                <p className="text-xs text-green-600">New inventory</p>
              </button>
              <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">👤</div>
                <p className="font-medium text-purple-900">Add Customer</p>
                <p className="text-xs text-purple-600">New customer</p>
              </button>
              <button className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-left transition group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🔧</div>
                <p className="font-medium text-orange-900">Maintenance</p>
                <p className="text-xs text-orange-600">{stats?.maintenanceItems || 0} items</p>
              </button>
            </div>
          </div>
        </div>
      </StaffLayout>
    </ProtectedRoute>
  )
}
