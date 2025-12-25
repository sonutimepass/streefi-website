import type { Vendor } from '@/types';

/**
 * Vendor Service
 * Handles all vendor-related API calls
 */

export async function fetchVendors(): Promise<Vendor[]> {
  const response = await fetch('/api/vendors');
  if (!response.ok) {
    throw new Error('Failed to fetch vendors');
  }
  return response.json();
}
