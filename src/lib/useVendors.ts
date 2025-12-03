'use client';
import { useState, useEffect } from 'react';

interface Vendor {
  _id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  image: string;
  description: string;
  location: string;
  experience: number;
  revenueGrowth: number;
}

export function useVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/vendors');
        if (!response.ok) {
          throw new Error('Failed to fetch vendors');
        }
        const data = await response.json();
        setVendors(data);
      } catch (err) {
        console.error('Error fetching vendors:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  return { vendors, loading };
}
