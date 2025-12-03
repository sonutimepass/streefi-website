import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await connectDB();
    
    // Get vendor count
    const vendorCount = await db.collection('vendors').countDocuments();
    const approvedCount = await db.collection('vendors').countDocuments({ 
      verifyStatus: 'approve',
      isExplore: true 
    });
    
    // Get sample vendors
    const sampleVendors = await db.collection('vendors')
      .find({ verifyStatus: 'approve', isExplore: true })
      .limit(5)
      .toArray();
    
    return NextResponse.json({ 
      success: true,
      message: 'Connected to MongoDB!',
      database: db.databaseName,
      stats: {
        totalVendors: vendorCount,
        approvedExploreVendors: approvedCount
      },
      sampleVendors: sampleVendors.map(v => ({
        id: v._id.toString(),
        name: v.businessName,
        type: v.stallType,
        status: v.verifyStatus,
        isExplore: v.isExplore
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
