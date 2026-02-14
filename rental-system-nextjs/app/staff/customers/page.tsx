'use client'

import { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import StaffLayout from '@/components/layouts/StaffLayout'
import api from '@/lib/api'
import { Search, Plus, X, Edit, Trash2, Phone, Mail, MapPin } from 'lucide-react'

interface Customer {
    id: number
    name: string
    email: string
    phone: string
    address?: string
    createdAt: string
}

interface CustomerFormData {
    name: string
    email: string
    phone: string
    address: string
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
    const [formData, setFormData] = useState<CustomerFormData>({
        name: '',
        email: '',
        phone: '',
        address: ''
    })

    useEffect(() => {
        fetchCustomers()
    }, [])

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers')
            setCustomers(response.data.customers || response.data || [])
        } catch (error) {
            console.error('Error fetching customers:', error)
            alert('Failed to fetch customers')
        } finally {
            setLoading(false)
        }
    }

    const handleOpenModal = (customer?: Customer) => {
        if (customer) {
            setEditingCustomer(customer)
            setFormData({
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address || ''
            })
        } else {
            setEditingCustomer(null)
            setFormData({
                name: '',
                email: '',
                phone: '',
                address: ''
            })
        }
        setShowModal(true)
    }

    const handleCloseModal = () => {
        setShowModal(false)
        setEditingCustomer(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            if (editingCustomer) {
                await api.put(`/customers/${editingCustomer.id}`, formData)
                alert('Customer updated successfully!')
            } else {
                await api.post('/customers', formData)
                alert('Customer created successfully!')
            }

            handleCloseModal()
            fetchCustomers()
        } catch (error: any) {
            console.error('Error saving customer:', error)
            alert(error.response?.data?.message || 'Failed to save customer')
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this customer?')) return

        try {
            await api.delete(`/customers/${id}`)
            alert('Customer deleted successfully!')
            fetchCustomers()
        } catch (error: any) {
            console.error('Error deleting customer:', error)
            alert(error.response?.data?.message || 'Failed to delete customer')
        }
    }

    const filteredCustomers = customers.filter((customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm)
    )

    return (
        <ProtectedRoute>
            <StaffLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                            <p className="text-gray-600">Manage customer information</p>
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            <Plus size={20} />
                            <span>Add Customer</span>
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                        {/* Search */}
                        <div className="p-6 border-b border-gray-200">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search customers by name, email, or phone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            {loading ? (
                                <div className="flex items-center justify-center h-64">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Customer
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Contact
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Address
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Joined
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredCustomers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                No customers found
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCustomers.map((customer) => (
                                            <tr key={customer.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900">{customer.name}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col space-y-1">
                                                        <div className="flex items-center text-sm text-gray-600">
                                                            <Mail size={14} className="mr-2" />
                                                            {customer.email}
                                                        </div>
                                                        <div className="flex items-center text-sm text-gray-600">
                                                            <Phone size={14} className="mr-2" />
                                                            {customer.phone}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {customer.address ? (
                                                        <div className="flex items-start text-sm text-gray-600">
                                                            <MapPin size={14} className="mr-2 mt-0.5" />
                                                            <span>{customer.address}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {new Date(customer.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                                    <button
                                                        onClick={() => handleOpenModal(customer)}
                                                        className="inline-flex items-center text-blue-600 hover:text-blue-800"
                                                    >
                                                        <Edit size={16} className="mr-1" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(customer.id)}
                                                        className="inline-flex items-center text-red-600 hover:text-red-800"
                                                    >
                                                        <Trash2 size={16} className="mr-1" />
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                                    </h2>
                                    <button
                                        onClick={handleCloseModal}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="John Doe"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Email *
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="john@example.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Phone *
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="+1 (555) 123-4567"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Address
                                        </label>
                                        <textarea
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="123 Main St, City, State"
                                            rows={2}
                                        />
                                    </div>

                                    <div className="flex space-x-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={handleCloseModal}
                                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                        >
                                            {editingCustomer ? 'Update' : 'Create'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </StaffLayout>
        </ProtectedRoute>
    )
}