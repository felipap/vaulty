import { NextRequest } from 'next/server'
import { validateDeviceAuth } from '@/lib/device-auth'

export function authMobileRequest(
  handler: (request: NextRequest) => Promise<Response>,
) {
  return async (request: NextRequest): Promise<Response> => {
    if (!validateDeviceAuth(request)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return handler(request)
  }
}

