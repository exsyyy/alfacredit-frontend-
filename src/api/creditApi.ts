import type { Application, ApplicationSummary, Company, CreateApplicationRequest, CreateApplicationResponse, PagedResponse, Product } from '../types/api'

export interface CreditApi {
  getProducts(): Promise<Product[]>
  getCompanies(): Promise<Company[]>
  createApplication(request: CreateApplicationRequest): Promise<CreateApplicationResponse>
  getApplication(id: string): Promise<Application>
  listApplications(page?: number): Promise<PagedResponse<ApplicationSummary>>
  acceptOffer(id: string): Promise<Application>
  declineOffer(id: string): Promise<Application>
  cancelApplication(id: string): Promise<Application>
}
