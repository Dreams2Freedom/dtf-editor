'use client';

import React from 'react';

interface BillingManagementProps {
  onSubscriptionUpdate?: () => void;
}

export const BillingManagement: React.FC<BillingManagementProps> = ({ onSubscriptionUpdate }) => {
  // Temporarily disabled due to Stripe integration issues
  return (
    <div className="p-8 text-center">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Management</h3>
      <p className="text-gray-600">Billing management is being set up. Please check back soon!</p>
    </div>
  );
}; 