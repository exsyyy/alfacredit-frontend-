import type { Application, Company, CreateApplicationRequest, CreateApplicationResponse, Product } from '../types/api'

export interface CreditApi {
  getProducts(): Promise<Product[]>
  getCompanies(): Promise<Company[]>
  createApplication(request: CreateApplicationRequest): Promise<CreateApplicationResponse>
  getApplication(id: string): Promise<Application>
}
