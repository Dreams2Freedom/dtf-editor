'use client'

import { useRequireAuth } from '@/contexts/AuthContext'
import { useAuthContext } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { LogOut, User, CreditCard, Settings } from 'lucide-react'

export default function DashboardPage() {
  const { loading } = useRequireAuth()
  const { user, profile, creditsRemaining, subscriptionStatus, signOut } = useAuthContext()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">DTF Editor</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Credits: {creditsRemaining}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut()}
                leftIcon={<LogOut className="h-4 w-4" />}
              >
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* User Profile Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 bg-primary-500 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {profile?.first_name} {profile?.last_name}
                    </h3>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Credits Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 bg-accent-500 rounded-full flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {creditsRemaining} Credits
                    </h3>
                    <p className="text-sm text-gray-500">
                      {subscriptionStatus} plan
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Settings Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 bg-gray-500 rounded-full flex items-center justify-center">
                      <Settings className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Settings
                    </h3>
                    <p className="text-sm text-gray-500">
                      Manage your account
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="mt-8 bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Welcome to DTF Editor!
              </h2>
              <p className="text-gray-600 mb-4">
                You&apos;re now signed in and ready to start processing images. Your authentication system is working correctly.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  What&apos;s Next?
                </h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Upload and process images</li>
                  <li>• Manage your subscription</li>
                  <li>• View your processing history</li>
                  <li>• Update your profile settings</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 