export interface EndpointRegistration {
  method: string
  path: string
  params?: string
  bodySchema?: string
  responseSchema?: string
}

export interface InterceptPayload {
  endpointId: string
  method: string
  path: string
  status: number
  requestHeaders?: string
  requestBody?: string
  responseHeaders?: string
  responseBody?: string
  durationMs: number
}

export interface GerbaudoOptions {
  daemonUrl?: string
  batchInterval?: number
  batchSize?: number
  app?: { _router?: { stack: unknown[] } }
}
