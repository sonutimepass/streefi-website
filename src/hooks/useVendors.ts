'use client';
import { useState, useEffect } from 'react';
import type { Vendor } from '@/types';
import { fetchVendors } from '@/services';

export function useVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVendors = async () => {
      try {
        setLoading(true);
        const data = await fetchVendors();
        setVendors(data);
      } catch (err) {
        console.error('Error fetching vendors:', err);
      } finally {
        setLoading(false);
      }
    };

    loadVendors();
  }, []);

  return { vendors, loading };
}
