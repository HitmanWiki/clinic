// app/api/clinic/settings/route.ts
import { NextResponse } from 'next/server';

// Redirect to the actual settings endpoint
export async function GET(request: Request) {
  // Extract the full URL path
  const url = new URL(request.url);
  const baseUrl = url.origin;
  
  // Redirect to the correct endpoint
  return NextResponse.redirect(`${baseUrl}/api/settings/clinic`, 308);
}

export async function PUT(request: Request) {
  const url = new URL(request.url);
  const baseUrl = url.origin;
  return NextResponse.redirect(`${baseUrl}/api/settings/clinic`, 308);
}

export async function PATCH(request: Request) {
  const url = new URL(request.url);
  const baseUrl = url.origin;
  return NextResponse.redirect(`${baseUrl}/api/settings/clinic`, 308);
}