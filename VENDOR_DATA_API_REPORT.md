# Streefi Vendor Data API - Production Implementation Guide

## Overview
This report provides a comprehensive guide for implementing MongoDB-based vendor data API for the Streefi food platform. Currently using mock data, this guide will help you transition to a production-ready MongoDB solution.

## Current Architecture Analysis

### 1. Current Data Model (Vendor Interface)
```typescript
interface Vendor {
  _id: string;           // MongoDB ObjectId as string
  name: string;          // Vendor business name
  specialty: string;     // Food category/specialty
  rating: number;        // Average rating (0-5)
  reviews: number;       // Total review count (NOT IMPLEMENTED YET)
  image: string;         // Image path/URL
  description: string;   // Business description
  location: string;      // Physical location
  experience: number;    // Years in business
  revenueGrowth: number; // Growth percentage
}
```

### 2. Current API Endpoints
- **GET /api/vendors** - Fetches all vendors (currently returns mock data)
- **Status**: Mock implementation only

### 3. Current Service Layer
- **vendorService.ts**: Simple fetch wrapper
- **useVendors.ts**: React hook with loading states
- **mongodb.ts**: Connection setup (commented out)

## MongoDB Production Setup

### 1. Environment Variables Required
```bash
# Add to .env.local
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=streefi
```

### 2. MongoDB Schema Design

#### Recommended Collection: `vendors`
```javascript
{
  _id: ObjectId("..."),
  name: "King Of Sandwich",
  specialty: "Sandwiches",
  rating: 4.8,
  reviewCount: 156,                    // Total reviews
  reviews: [                           // Recent reviews array
    {
      userId: ObjectId("..."),
      rating: 5,
      comment: "Amazing food!",
      date: ISODate("2024-01-15"),
      verified: true
    }
  ],
  image: "/assets/vendor/vendor9.jpg",
  description: "Best grilled sandwiches...",
  location: {
    address: "Gandhinagar, Gujarat",
    coordinates: {
      lat: 23.2156,
      lng: 72.6369
    },
    area: "Gandhinagar",
    pincode: "382010"
  },
  contact: {
    phone: "+91-9876543210",
    email: "kingofSandwich@gmail.com",
    whatsapp: "+91-9876543210"
  },
  business: {
    experience: 8,
    revenueGrowth: 40,
    established: 2016,
    timing: {
      open: "09:00",
      close: "22:00",
      isOpen24x7: false
    },
    daysOpen: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  },
  menu: [
    {
      itemId: ObjectId("..."),
      name: "Grilled Chicken Sandwich",
      price: 120,
      category: "Sandwich",
      isAvailable: true,
      image: "/menu/chicken-sandwich.jpg"
    }
  ],
  offers: [
    {
      title: "20% Off on Orders Above ₹200",
      code: "SAVE20",
      validTill: ISODate("2024-12-31"),
      isActive: true
    }
  ],
  stats: {
    totalOrders: 1250,
    monthlyRevenue: 45000,
    avgOrderValue: 180,
    customerRetention: 65
  },
  isActive: true,
  isVerified: true,
  createdAt: ISODate("2024-01-01"),
  updatedAt: ISODate("2024-01-15")
}
```

### 3. Production MongoDB Connection
```typescript
// lib/mongodb.ts - Production Ready
import { MongoClient, Db, Collection } from 'mongodb';

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<Db> {
    if (this.db) {
      return this.db;
    }

    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME || 'streefi';

    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    try {
      this.client = new MongoClient(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();
      this.db = this.client.db(dbName);
      
      console.log('✅ MongoDB connected successfully');
      return this.db;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  public async getCollection<T = any>(collectionName: string): Promise<Collection<T>> {
    const db = await this.connect();
    return db.collection<T>(collectionName);
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }
}

export const dbConnection = DatabaseConnection.getInstance();
```

### 4. Enhanced Vendor Service
```typescript
// services/vendorService.ts - Production Ready
import { dbConnection } from '@/lib/mongodb';
import type { Vendor } from '@/types';
import { ObjectId } from 'mongodb';

export class VendorService {
  private static collectionName = 'vendors';

  // Fetch all active vendors with pagination
  static async getAllVendors(
    page: number = 1, 
    limit: number = 20,
    filters?: {
      specialty?: string;
      location?: string;
      minRating?: number;
    }
  ): Promise<{
    vendors: Vendor[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const collection = await dbConnection.getCollection<Vendor>(this.collectionName);
    
    const query: any = { isActive: true };
    
    // Apply filters
    if (filters?.specialty) {
      query.specialty = { $regex: filters.specialty, $options: 'i' };
    }
    if (filters?.location) {
      query['location.area'] = { $regex: filters.location, $options: 'i' };
    }
    if (filters?.minRating) {
      query.rating = { $gte: filters.minRating };
    }

    const skip = (page - 1) * limit;
    
    const [vendors, totalCount] = await Promise.all([
      collection
        .find(query)
        .sort({ rating: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query)
    ]);

    return {
      vendors,
      totalCount,
      hasMore: totalCount > page * limit
    };
  }

  // Get vendor by ID
  static async getVendorById(vendorId: string): Promise<Vendor | null> {
    const collection = await dbConnection.getCollection<Vendor>(this.collectionName);
    return collection.findOne({ 
      _id: new ObjectId(vendorId), 
      isActive: true 
    });
  }

  // Search vendors
  static async searchVendors(searchTerm: string): Promise<Vendor[]> {
    const collection = await dbConnection.getCollection<Vendor>(this.collectionName);
    
    return collection
      .find({
        isActive: true,
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { specialty: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { 'location.area': { $regex: searchTerm, $options: 'i' } }
        ]
      })
      .sort({ rating: -1 })
      .limit(20)
      .toArray();
  }

  // Get featured vendors (high rating + good stats)
  static async getFeaturedVendors(): Promise<Vendor[]> {
    const collection = await dbConnection.getCollection<Vendor>(this.collectionName);
    
    return collection
      .find({
        isActive: true,
        rating: { $gte: 4.5 },
        'stats.totalOrders': { $gte: 100 }
      })
      .sort({ rating: -1, 'stats.totalOrders': -1 })
      .limit(10)
      .toArray();
  }

  // Get vendors by location
  static async getVendorsByLocation(location: string): Promise<Vendor[]> {
    const collection = await dbConnection.getCollection<Vendor>(this.collectionName);
    
    return collection
      .find({
        isActive: true,
        'location.area': { $regex: location, $options: 'i' }
      })
      .sort({ rating: -1 })
      .toArray();
  }
}
```

### 5. Enhanced API Routes
```typescript
// app/api/vendors/route.ts - Production Ready
import { NextRequest, NextResponse } from 'next/server';
import { VendorService } from '@/services/vendorService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const specialty = searchParams.get('specialty') || undefined;
    const location = searchParams.get('location') || undefined;
    const minRating = searchParams.get('minRating') 
      ? parseFloat(searchParams.get('minRating')!) 
      : undefined;
    
    const result = await VendorService.getAllVendors(page, limit, {
      specialty,
      location,
      minRating
    });

    return NextResponse.json({
      success: true,
      data: result,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(result.totalCount / limit),
        totalCount: result.totalCount,
        hasMore: result.hasMore
      }
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

// app/api/vendors/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vendor = await VendorService.getVendorById(params.id);
    
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: vendor
    });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vendor' },
      { status: 500 }
    );
  }
}

// app/api/vendors/search/route.ts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400 }
      );
    }

    const vendors = await VendorService.searchVendors(query);

    return NextResponse.json({
      success: true,
      data: vendors
    });
  } catch (error) {
    console.error('Error searching vendors:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}

// app/api/vendors/featured/route.ts
export async function GET() {
  try {
    const vendors = await VendorService.getFeaturedVendors();

    return NextResponse.json({
      success: true,
      data: vendors
    });
  } catch (error) {
    console.error('Error fetching featured vendors:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch featured vendors' },
      { status: 500 }
    );
  }
}
```

### 6. Enhanced React Hooks
```typescript
// hooks/useVendors.ts - Production Ready
'use client';
import { useState, useEffect, useCallback } from 'react';
import type { Vendor } from '@/types';

interface VendorFilters {
  specialty?: string;
  location?: string;
  minRating?: number;
}

interface UseVendorsResult {
  vendors: Vendor[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  search: (query: string) => Promise<void>;
  applyFilters: (filters: VendorFilters) => Promise<void>;
}

export function useVendors(initialLimit: number = 20): UseVendorsResult {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<VendorFilters>({});
  const [searchQuery, setSearchQuery] = useState('');

  const fetchVendors = useCallback(async (
    page: number = 1,
    append: boolean = false,
    query?: string,
    vendorFilters?: VendorFilters
  ) => {
    try {
      setLoading(true);
      setError(null);

      let url = `/api/vendors?page=${page}&limit=${initialLimit}`;
      
      if (query) {
        url = `/api/vendors/search?q=${encodeURIComponent(query)}`;
      } else {
        const params = new URLSearchParams();
        if (vendorFilters?.specialty) params.append('specialty', vendorFilters.specialty);
        if (vendorFilters?.location) params.append('location', vendorFilters.location);
        if (vendorFilters?.minRating) params.append('minRating', vendorFilters.minRating.toString());
        
        if (params.toString()) {
          url += `&${params.toString()}`;
        }
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch vendors');
      }

      if (query) {
        // Search results
        setVendors(data.data);
        setTotalCount(data.data.length);
        setHasMore(false);
        setCurrentPage(1);
      } else {
        // Paginated results
        if (append) {
          setVendors(prev => [...prev, ...data.data.vendors]);
        } else {
          setVendors(data.data.vendors);
        }
        setTotalCount(data.data.totalCount);
        setHasMore(data.data.hasMore);
        setCurrentPage(page);
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [initialLimit]);

  // Initial load
  useEffect(() => {
    fetchVendors(1, false, searchQuery, filters);
  }, [fetchVendors]);

  const loadMore = useCallback(async () => {
    if (hasMore && !loading) {
      await fetchVendors(currentPage + 1, true, searchQuery, filters);
    }
  }, [hasMore, loading, currentPage, fetchVendors, searchQuery, filters]);

  const refresh = useCallback(async () => {
    await fetchVendors(1, false, searchQuery, filters);
  }, [fetchVendors, searchQuery, filters]);

  const search = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      await fetchVendors(1, false, query);
    } else {
      await fetchVendors(1, false, '', filters);
    }
  }, [fetchVendors, filters]);

  const applyFilters = useCallback(async (newFilters: VendorFilters) => {
    setFilters(newFilters);
    await fetchVendors(1, false, searchQuery, newFilters);
  }, [fetchVendors, searchQuery]);

  return {
    vendors,
    loading,
    error,
    hasMore,
    totalCount,
    currentPage,
    loadMore,
    refresh,
    search,
    applyFilters
  };
}

// hooks/useVendorDetails.ts
export function useVendorDetails(vendorId: string) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVendorDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/vendors/${vendorId}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Vendor not found');
        }

        setVendor(data.data);
      } catch (err) {
        console.error('Error fetching vendor details:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (vendorId) {
      fetchVendorDetails();
    }
  }, [vendorId]);

  return { vendor, loading, error };
}
```

## Production Deployment Checklist

### 1. Database Setup
- [ ] Create MongoDB Atlas cluster or self-hosted instance
- [ ] Set up database indexes for performance
- [ ] Configure backup and monitoring
- [ ] Set up environment variables

### 2. Data Migration
- [ ] Import existing vendor data to MongoDB
- [ ] Validate data integrity
- [ ] Set up data seeding scripts

### 3. API Security
- [ ] Implement rate limiting
- [ ] Add input validation and sanitization
- [ ] Set up CORS properly
- [ ] Add API authentication if needed

### 4. Performance Optimization
- [ ] Add Redis caching layer
- [ ] Implement database connection pooling
- [ ] Set up CDN for images
- [ ] Add error monitoring (Sentry)

### 5. Monitoring & Analytics
- [ ] Set up API monitoring
- [ ] Add performance metrics
- [ ] Implement logging
- [ ] Set up alerts

## Database Indexes (MongoDB)
```javascript
// Create these indexes for optimal performance
db.vendors.createIndex({ "isActive": 1, "rating": -1 })
db.vendors.createIndex({ "location.area": 1, "isActive": 1 })
db.vendors.createIndex({ "specialty": 1, "isActive": 1 })
db.vendors.createIndex({ "name": "text", "description": "text", "specialty": "text" })
```

## Environment Variables (.env.local)
```bash
# MongoDB Configuration
MONGODB_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=streefi

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379

# Optional: Image CDN
NEXT_PUBLIC_CDN_URL=https://your-cdn.com

# Error Monitoring
SENTRY_DSN=your-sentry-dsn
```

## Next Steps for Production
1. **Replace mock data** with MongoDB implementation
2. **Set up proper error handling** and logging
3. **Implement caching** for frequently accessed data
4. **Add data validation** at API level
5. **Set up monitoring** and analytics
6. **Create admin dashboard** for vendor management
7. **Implement real-time updates** with WebSockets if needed

This report provides a complete production-ready architecture for your vendor data API. The implementation includes proper error handling, pagination, search, filtering, and follows best practices for scalable web applications.