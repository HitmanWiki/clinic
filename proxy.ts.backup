// proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Use default export
export default async function proxy(request: NextRequest) {
  const response = NextResponse.next()
  
  // Apply CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  return response
}

// Config is optional for proxy
// export const config = {
//   matcher: '/api/:path*',
// }