import { NextResponse } from 'next/server';

const mockVendors = [
  {
    _id: "1",
    name: "Sagar's Pav Bhaji",
    specialty: "Pav Bhaji & Masala Dosa",
    rating: 4.8,
    reviews: 287,
    image: "/assets/vendor1.jpg",
    description: "Famous for butter pav bhaji and crispy masala dosa served hot",
    location: "GH-4, Swarnim Park, Gandhinagar",
    experience: 8,
    revenueGrowth: 165
  },
  {
    _id: "2",
    name: "Taste of Gujarat",
    specialty: "Dhokla & Khandvi",
    rating: 4.7,
    reviews: 198,
    image: "/assets/vendor2.jpg",
    description: "Authentic Gujarati snacks with traditional flavors",
    location: "GH-4, Swarnim Park, Gandhinagar",
    experience: 12,
    revenueGrowth: 180
  },
  {
    _id: "3",
    name: "Mohan's Sandwich Corner",
    specialty: "Grilled Sandwich & Maggi",
    rating: 4.6,
    reviews: 342,
    image: "/assets/vendor3.jpg",
    description: "Popular sandwich stall with cheese grilled and veg options",
    location: "GH-4, Swarnim Park, Gandhinagar",
    experience: 5,
    revenueGrowth: 145
  },
  {
    _id: "4",
    name: "Chai Sutta Bar",
    specialty: "Tea & Coffee",
    rating: 4.9,
    reviews: 456,
    image: "/assets/vendor4.jpg",
    description: "Best cutting chai and cold coffee in the area",
    location: "GH-4, Swarnim Park, Gandhinagar",
    experience: 3,
    revenueGrowth: 220
  },
  {
    _id: "5",
    name: "Rajkot Dabeli Wala",
    specialty: "Dabeli & Vada Pav",
    rating: 4.8,
    reviews: 289,
    image: "/assets/vendor5.jpg",
    description: "Spicy dabeli with sweet and tangy chatni, must try vada pav",
    location: "GH-4, Swarnim Park, Gandhinagar",
    experience: 7,
    revenueGrowth: 195
  },
  {
    _id: "6",
    name: "Fresh Juice Corner",
    specialty: "Fresh Juices & Shakes",
    rating: 4.7,
    reviews: 215,
    image: "/assets/vendor6.jpg",
    description: "Freshly made fruit juices and thick shakes with real fruits",
    location: "GH-4, Swarnim Park, Gandhinagar",
    experience: 4,
    revenueGrowth: 175
  }
];

export async function GET() {
  // Return mock data only
  return NextResponse.json(mockVendors);
}
