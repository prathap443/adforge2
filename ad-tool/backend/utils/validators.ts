import { ProductInput } from '../types'

interface ValidationResult {
  success: boolean
  data?: ProductInput
  errors?: string[]
}

export function validateProductInput(body: any): ValidationResult {
  const errors: string[] = []
  const required = ['productName', 'description', 'targetAudience', 'painPoint', 'mainBenefit', 'cta']

  for (const field of required) {
    if (!body[field] || typeof body[field] !== 'string' || body[field].trim().length === 0) {
      errors.push(`${field} is required`)
    }
  }

  if (errors.length > 0) return { success: false, errors }

  return {
    success: true,
    data: {
      productName: body.productName.trim(),
      description: body.description.trim(),
      targetAudience: body.targetAudience.trim(),
      painPoint: body.painPoint.trim(),
      mainBenefit: body.mainBenefit.trim(),
      cta: body.cta.trim(),
      screenshots: []
    }
  }
}
