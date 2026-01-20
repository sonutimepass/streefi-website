import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = false;

const mockVendors = [
  {
    _id: "1",
    name: "King Of Sandwich",
    specialty: "Sandwiches",
    rating: 4.8,
    image: "/assets/vendor/vendor9.jpg",
    description: "Best grilled sandwiches with rich fillings and unique sauces",
    location: "Gandhinagar",
    experience: 8,
    revenueGrowth: 40
  },
  {
    _id: "2",
    name: "Mahendra Kaka Ni Soda",
    specialty: "Soda & Drinks",
    rating: 4.7,
    image: "/assets/vendor/vendor10.jpg",
    description: "Refreshing soda and drinks with classic original taste",
    location: "Gandhinagar",
    experience: 12,
    revenueGrowth: 50
  },
  {
    _id: "3",
    name: "Bajrang Fast Food",
    specialty: "Gujarati Nasto",
    rating: 4.6,
    image: "/assets/vendor/vendor2.jpg",
    description: "Authentic Gujarati snacks prepared fresh daily for you.",
    location: "G-4, Gandhinagar",
    experience: 5,
    revenueGrowth: 145
  },
  {
    _id: "4",
    name: "Dil Khush Famous Momos",
    specialty: "Momos",
    rating: 4.9,
    image: "/assets/vendor/vendor6.jpg",
    description: "Most loved momos with spicy chutney, a true Gandhinagar favourite",
    location: "Gandhinagar",
    experience: 3,
    revenueGrowth: 100
  },
  {
    _id: "5",
    name: "DFC-Delhi Food Court",
    specialty: "Momos & Paratha",
    rating: 4.8,
    image: "/assets/vendor/vendor13.jpg",
    description: "Spicy Momos and Parathas with sweet and tangy chutneys, must-try their special Kurkure Momos",
    location: "Gandhinagar",
    experience: 7,
    revenueGrowth: 195
  },
  {
    _id: "6",
    name: "Amardeep Bhel Pakodi Center",
    specialty: "Bhel & Pakodi",
    rating: 4.7,
    image: "/assets/vendor/vendor14.jpg",
    description: "Best pakodi in Sector 6, famous for crunch and freshness",
    location: "Sector 6, Gandhinagar",
    experience: 4,
    revenueGrowth: 175
  }
];

export async function GET() {
  // Return mock data only
  return NextResponse.json(mockVendors);
}
