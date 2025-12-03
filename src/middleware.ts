import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Policy-related redirects
  const policyRedirects: Record<string, string> = {
    '/privacy': '/policies/policy#privacy',
    '/terms': '/policies/policy#terms',
    '/refund': '/policies/policy#refund',
    '/pricing': '/policies/policy#pricing',
    '/cookies': '/policies/policy#cookies',
    '/security': '/policies/policy#security',
    '/customer': '/policies/policy#customer',
    '/promotion': '/policies/policy#promotion',
    '/rating': '/policies/policy#rating',
    '/wishlist': '/policies/policy#wishlist',
    '/dinein': '/policies/policy#dineinpolicy',
    '/dine-in': '/policies/policy#dineinpolicy',
  };
  
  // Support-related redirects
  const supportRedirects: Record<string, string> = {
    '/help': '/policies/support',
    '/support': '/policies/support',
  };
  
  // General redirects
  const generalRedirects: Record<string, string> = {
    '/policy': '/policies/policy',
  };
  
  // Combine all redirects
  const allRedirects = { ...policyRedirects, ...supportRedirects, ...generalRedirects };
  
  // Check if current path needs redirect
  if (allRedirects[path]) {
    return NextResponse.redirect(new URL(allRedirects[path], request.url), 308);
  }
  
  // Allow all other requests to pass through
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|assets).*)',
  ],
};
