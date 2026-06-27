export interface InterceptRecord {
  id: string
  endpointId: string
  method: string
  path: string
  status: number
  requestHeaders?: string
  requestBody?: string
  responseHeaders?: string
  responseBody?: string
  durationMs: number
  createdAt: string
}
