export interface Endpoint {
  id: string
  method: string
  path: string
  params?: string
  bodySchema?: string
  responseSchema?: string
  createdAt: string
  updatedAt: string
}
