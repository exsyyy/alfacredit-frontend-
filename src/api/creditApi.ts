import type { Application, ApplicationSummary, Company, Contract, CreateApplicationRequest, CreateApplicationResponse, PagedResponse, Product, SignCodeResponse } from '../types/api'

export interface CreditApi {
  getProducts(): Promise<Product[]>
  getCompanies(): Promise<Company[]>
  createApplication(request: CreateApplicationRequest): Promise<CreateApplicationResponse>
  getApplication(id: string): Promise<Application>
  listApplications(page?: number): Promise<PagedResponse<ApplicationSummary>>
  acceptOffer(id: string): Promise<Application>
  declineOffer(id: string): Promise<Application>
  cancelApplication(id: string): Promise<Application>
  getContract(id: string): Promise<Contract>
  getContractDocument(id: string): Promise<Blob>
  requestSigningCode(id: string): Promise<SignCodeResponse>
  signContract(id: string, code: string): Promise<Application>
}
