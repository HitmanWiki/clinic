// middleware.ts in root of clinic-portal
import { NextRequest, NextResponse } from 'next/server';
import Cors from 'cors';

const cors = Cors({
  origin: ['http://localhost:8081', 'http://localhost:19006', /\.*\.local$/],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Apply CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};