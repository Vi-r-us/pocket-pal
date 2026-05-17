import type { ApiEnvelope } from '@/types/api'

export type ImportType = 'transactions' | 'accounts' | 'budgets' | 'categories'

export type ImportField = {
  key: string
  label: string
}

export type ImportParseResponse = {
  importType: ImportType
  sourceColumns: string[]
  requiredFields: ImportField[]
  optionalFields: ImportField[]
  sampleRows: Record<string, string>[]
  totalRows: number
  sessionToken: string
}

export type ImportCommitResponse = {
  importType: ImportType
  totalRows: number
  importedRows: number
  skippedRows: number
  failedRows: number
  errors: Array<{
    row: number
    message: string
  }>
}

export type ImportCommitRequest = {
  sessionToken: string
  importType: ImportType
  fieldMapping: Record<string, string>
  options?: {
    skipDuplicates?: boolean
  }
}

export type ApiSuccess<T> = ApiEnvelope<T>
