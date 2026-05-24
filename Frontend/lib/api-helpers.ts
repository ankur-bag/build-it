/**
 * API Response helpers
 * Consistent response formatting across all API routes
 */

import { NextResponse } from 'next/server'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Success response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  statusCode = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status: statusCode }
  )
}

/**
 * Error response
 */
export function errorResponse(
  error: string,
  statusCode = 500
): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status: statusCode }
  )
}

/**
 * Created response (201)
 */
export function createdResponse<T>(
  data: T,
  message?: string
): NextResponse<ApiResponse<T>> {
  return successResponse(data, message, 201)
}

/**
 * Bad request response (400)
 */
export function badRequestResponse(error: string): NextResponse<ApiResponse<null>> {
  return errorResponse(error, 400)
}

/**
 * Unauthorized response (401)
 */
export function unauthorizedResponse(): NextResponse<ApiResponse<null>> {
  return errorResponse('Unauthorized', 401)
}

/**
 * Not found response (404)
 */
export function notFoundResponse(resource?: string): NextResponse<ApiResponse<null>> {
  return errorResponse(`${resource || 'Resource'} not found`, 404)
}

/**
 * Conflict response (409)
 */
export function conflictResponse(error: string): NextResponse<ApiResponse<null>> {
  return errorResponse(error, 409)
}
