/**
 * Catch-all route for undefined API endpoints.
 * Returns proper HTTP 404 for any API path that doesn't have a specific handler.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      error: 'Not Found',
      message: 'This API endpoint does not exist',
    },
    { status: 404 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'Not Found',
      message: 'This API endpoint does not exist',
    },
    { status: 404 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      error: 'Not Found',
      message: 'This API endpoint does not exist',
    },
    { status: 404 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      error: 'Not Found',
      message: 'This API endpoint does not exist',
    },
    { status: 404 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      error: 'Not Found',
      message: 'This API endpoint does not exist',
    },
    { status: 404 }
  );
}
