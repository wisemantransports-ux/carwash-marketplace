
'use client';

import React from 'react';
import CustomerBookingsPage from '../bookings/page';

/**
 * @fileOverview Customer Dashboard Wrapper
 * Serves as the primary entry point for logged-in customers.
 * Reuses the bookings tracker logic as the main dashboard view.
 */
export default function CustomerDashboardPage() {
  return <CustomerBookingsPage />;
}
