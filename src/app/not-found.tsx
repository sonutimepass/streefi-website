import Link from 'next/link';
import { Home, Search, MapPin } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <h1 className="text-[120px] md:text-[180px] font-bold text-gray-200 leading-none select-none">
            404
          </h1>
        </div>

        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
          Page Not Found
        </h2>
        
        <p className="text-gray-700 text-lg md:text-xl mb-8 max-w-xl mx-auto">
          Looks like this page took a wrong turn! The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#06c167] text-white rounded-full font-medium hover:bg-[#05a857] transition-all duration-300 shadow-md hover:shadow-lg"
          >
            <Home className="w-5 h-5" />
            Go to Homepage
          </Link>

          <Link
            href="/vendor"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gray-100 text-gray-900 rounded-full font-medium hover:bg-gray-200 transition-all duration-300 border-2 border-gray-300 hover:border-[#06c167]"
          >
            <Search className="w-5 h-5" />
            Find Vendors
          </Link>
        </div>

        <div className="pt-8 border-t border-gray-200">
          <p className="text-gray-600 mb-6 font-medium">
            Popular Pages
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/vendor"
              className="px-6 py-3 bg-white text-gray-700 rounded-full border-2 border-gray-200 hover:border-[#06c167] hover:text-[#06c167] transition-all duration-200 font-medium"
            >
              <MapPin className="w-4 h-4 inline mr-2" />
              Vendors Near You
            </Link>
            <Link
              href="/policies/support"
              className="px-6 py-3 bg-white text-gray-700 rounded-full border-2 border-gray-200 hover:border-[#06c167] hover:text-[#06c167] transition-all duration-200 font-medium"
            >
              Support
            </Link>
            <Link
              href="/policies/policy"
              className="px-6 py-3 bg-white text-gray-700 rounded-full border-2 border-gray-200 hover:border-[#06c167] hover:text-[#06c167] transition-all duration-200 font-medium"
            >
              Policies
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
