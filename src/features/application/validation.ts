import type { ApplicationFormValues, CreateApplicationRequest, FieldErrors, LoanPurpose, Product } from '../../types/api'

const formatNumber = (value: number) => new Intl.NumberFormat('ru-RU').format(value).replace(/\s/g, ' ')
const parseAmount = (value: string) => Number(value.replace(/\s/g, '').replace(',', '.'))

export function validateApplicationForm(values: ApplicationFormValues, product?: Product): FieldErrors {
  const errors: FieldErrors = {}

  if (!values.companyId.trim()) errors.companyId = 'Выберите компанию.'
  if (!values.productCode.trim()) errors.productCode = 'Выберите кредитный продукт.'
  else if (!product || product.code !== values.productCode) errors.productCode = 'Выберите продукт из списка.'

  if (!values.amount.trim()) errors.amount = 'Укажите сумму кредита.'
  else {
    const amount = parseAmount(values.amount)
    if (!Number.isFinite(amount)) errors.amount = 'Введите сумму числом.'
    else if (amount <= 0) errors.amount = 'Сумма должна быть больше нуля.'
    else if (product && (amount < product.minAmount || amount > product.maxAmount)) {
      errors.amount = `Для этого продукта сумма от ${formatNumber(product.minAmount)} до ${formatNumber(product.maxAmount)} ₽.`
    }
  }

  if (!values.termMonths.trim()) errors.termMonths = 'Укажите срок кредита.'
  else if (!/^\d+$/.test(values.termMonths.trim())) errors.termMonths = 'Срок должен быть целым числом месяцев.'
  else {
    const term = Number(values.termMonths)
    if (term < 1 || term > 120) errors.termMonths = 'Срок должен быть от 1 до 120 месяцев.'
    else if (product && (term < product.minTermMonths || term > product.maxTermMonths)) {
      errors.termMonths = `Для этого продукта срок от ${product.minTermMonths} до ${product.maxTermMonths} месяцев.`
    }
  }

  if (!values.purpose) errors.purpose = 'Выберите цель финансирования.'
  else if (product && !product.allowedPurposes.some((option) => option.code === values.purpose)) {
    errors.purpose = 'Эта цель недоступна для выбранного продукта.'
  }

  if (values.purposeDescription.length > 1000) errors.purposeDescription = 'Описание не длиннее 1000 символов.'
  return errors
}

export function toCreateRequest(values: ApplicationFormValues): CreateApplicationRequest {
  const description = values.purposeDescription.trim()
  return {
    companyId: values.companyId,
    productCode: values.productCode,
    amount: parseAmount(values.amount),
    termMonths: Number(values.termMonths),
    purpose: values.purpose as LoanPurpose,
    ...(description ? { purposeDescription: description } : {}),
  }
}
