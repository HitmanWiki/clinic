// proxy.ts in your project root
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export default function proxy(request: NextRequest) {
  return NextResponse.next()
}