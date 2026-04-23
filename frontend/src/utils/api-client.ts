import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import {
  API_TIMEOUT,
  BASE_API_URL,
  DEFAULT_API_REQUEST_ERROR,
  DEFAULT_NETWORK_CONNECTIVITY_ERROR,
} from '../constants/api'
import {
  getStoredActiveUserId,
  getStoredAuthToken,
} from './session'

type RequestMethod = 'get' | 'post' | 'patch' | 'delete'

interface RequestOptions<TData = unknown> {
  method: RequestMethod
  endpoint: string
  data?: TData
  params?: Record<string, unknown>
  headers?: Record<string, string>
  includeControllerApiPrefix?: boolean
}

export interface ApiSplitParticipant {
  id: string
  userId: string
  amountOwed: number | string
  amountPaid: number | string
  status: 'pending' | 'paid' | 'partial'
  walletAddress?: string | null
}

export interface ApiSplitItem {
  id: string
  splitId: string
  name: string
  quantity: number
  unitPrice: number | string
  totalPrice: number | string
  category?: string | null
  assignedToIds: string[]
}

export interface ApiSplitRecord {
  id: string
  totalAmount: number | string
  amountPaid: number | string
  status: 'active' | 'completed' | 'partial'
  description?: string | null
  preferredCurrency?: string | null
  creatorWalletAddress?: string | null
  dueDate?: string | null
  createdAt: string
  updatedAt: string
  participants: ApiSplitParticipant[]
  items?: ApiSplitItem[]
}

export interface ApiPaymentRecord {
  id: string
  splitId: string
  participantId: string
  txHash: string
  amount: number | string
  asset: string
  status: string
  settlementStatus?: string
  createdAt: string
  updatedAt?: string
}

export interface ApiPaymentStats {
  splitId: string
  totalAmount: number | string
  totalPaid: number | string
  remainingAmount: number | string
  paymentCount: number
  status: string
}

export interface ApiReceiptOcrData {
  items?: Array<{
    name: string
    quantity: number
    price: number
  }>
  subtotal?: number
  tax?: number
  tip?: number
  total?: number
  confidence?: number
}

export interface ApiReceiptRecord {
  id: string
  splitId: string
  uploadedBy: string
  originalFilename: string
  storagePath: string
  fileSize: number
  mimeType: string
  thumbnailPath?: string
  ocrProcessed: boolean
  ocrConfidenceScore?: number | string | null
  extractedData?: ApiReceiptOcrData | null
  createdAt: string
}

export interface ApiReceiptOcrResponse {
  processed: boolean
  data?: ApiReceiptOcrData | null
}

export interface ApiProfile {
  walletAddress: string
  displayName: string | null
  avatarUrl: string | null
  preferredCurrency: string
}

export interface ApiActivityRecord {
  id: string
  userId?: string
  activityType: string
  splitId?: string
  metadata: Record<string, unknown>
  isRead: boolean
  createdAt: string
}

export interface ApiDashboardSummary {
  totalOwed: number | string
  totalOwedToUser: number | string
  activeSplits: number
  splitsCreated: number
  unreadNotifications: number
  quickActions: Array<{
    id: string
    label: string
    route: string
    badge?: number
  }>
}

export interface ApiDashboardActivityResponse {
  data: ApiActivityRecord[]
  total: number
  page: number
  limit: number
  hasMore: boolean
  unreadCount: number
}

export interface ApiCreateSplitPayload {
  totalAmount: number
  description: string
  creatorWalletAddress: string
  preferredCurrency?: string
  dueDate?: string
  participants: Array<{
    userId: string
    amountOwed: number
    walletAddress?: string
  }>
  items?: Array<{
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
    assignedToIds: string[]
  }>
}

export interface ApiCreateActivityPayload {
  userId: string
  activityType: string
  splitId?: string
  metadata?: Record<string, unknown>
}

export interface ApiErrorLike {
  statusCode?: number
  message: string
  details?: unknown
  fieldErrors: Record<string, string>
  isNetworkError: boolean
}

export class ApiError extends Error implements ApiErrorLike {
  statusCode?: number
  details?: unknown
  fieldErrors: Record<string, string>
  isNetworkError: boolean

  constructor({
    message,
    statusCode,
    details,
    fieldErrors = {},
    isNetworkError = false,
  }: ApiErrorLike) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.details = details
    this.fieldErrors = fieldErrors
    this.isNetworkError = isNetworkError
  }
}

function createApiClient(baseURL: string) {
  const apiInstance = axios.create({
    baseURL,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  apiInstance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const authToken = getStoredAuthToken()
      const activeUserId = getStoredActiveUserId()

      if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`
      } else if (activeUserId) {
        config.headers['x-user-id'] = activeUserId
      }

      if (config.data instanceof FormData) {
        delete config.headers['Content-Type']
      }

      return config
    },
  )

  return apiInstance
}

function getBasePathname(): string {
  try {
    const url = new URL(
      BASE_API_URL,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
    )
    return url.pathname.replace(/\/+$/, '')
  } catch {
    return ''
  }
}

const BASE_PATHNAME = getBasePathname()

function isVersionedApiPathname(pathname: string): boolean {
  return /\/v\d+$/.test(pathname.replace(/\/+$/, ''))
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values))
}

/**
 * Builds the ordered list of path variants the HTTP client will try.
 * @param basePathname Pathname of `BASE_API_URL` (e.g. `/api` or `/api/v1`); when omitted, uses the running app’s configured API base.
 */
export function buildPathVariants(
  endpoint: string,
  includeControllerApiPrefix = false,
  basePathname: string = BASE_PATHNAME,
): string[] {
  const normalizedPath = basePathname.replace(/\/+$/, '')
  const versionPrefixes = isVersionedApiPathname(normalizedPath) ? [''] : ['/v1', '']
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const controllerPrefixes = includeControllerApiPrefix ? ['/api', ''] : ['']

  return uniqueValues(
    versionPrefixes.flatMap((versionPrefix) =>
      controllerPrefixes.map((controllerPrefix) =>
        `${versionPrefix}${controllerPrefix}${normalizedEndpoint}`.replace(
          /\/{2,}/g,
          '/',
        ),
      ),
    ),
  )
}

function extractMessages(input: unknown): string[] {
  if (!input) {
    return []
  }

  if (typeof input === 'string') {
    return [input]
  }

  if (Array.isArray(input)) {
    return input.flatMap((value) => extractMessages(value))
  }

  if (typeof input === 'object') {
    return Object.values(input as Record<string, unknown>).flatMap((value) =>
      extractMessages(value),
    )
  }

  return []
}

function inferFieldKey(message: string): string | null {
  const normalized = message.toLowerCase()

  if (normalized.includes('title') || normalized.includes('description')) {
    return 'title'
  }
  if (normalized.includes('currency')) {
    return 'currency'
  }
  if (normalized.includes('total') || normalized.includes('amount')) {
    return 'totalAmount'
  }
  if (normalized.includes('participant')) {
    return 'participants'
  }
  if (normalized.includes('item')) {
    return 'items'
  }
  if (normalized.includes('tax')) {
    return 'taxAmount'
  }
  if (normalized.includes('tip')) {
    return 'tipAmount'
  }
  if (normalized.includes('wallet')) {
    return 'walletAddress'
  }

  return null
}

function createFieldErrorMap(messages: string[]): Record<string, string> {
  return messages.reduce<Record<string, string>>((accumulator, message) => {
    const fieldKey = inferFieldKey(message)
    if (fieldKey && !accumulator[fieldKey]) {
      accumulator[fieldKey] = message
    }
    return accumulator
  }, {})
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  if (!axios.isAxiosError(error)) {
    return new ApiError({
      message: DEFAULT_API_REQUEST_ERROR,
      details: error,
      fieldErrors: {},
      isNetworkError: false,
    })
  }

  const axiosError = error as AxiosError<{
    message?: unknown
    error?: unknown
    statusCode?: number
  }>
  const responsePayload = axiosError.response?.data
  const messages = extractMessages(
    responsePayload?.message ?? responsePayload?.error ?? axiosError.message,
  )
  const message =
    messages[0] ??
    (axiosError.code === 'ECONNABORTED' || !axiosError.response
      ? DEFAULT_NETWORK_CONNECTIVITY_ERROR
      : DEFAULT_API_REQUEST_ERROR)

  return new ApiError({
    message,
    statusCode: axiosError.response?.status ?? responsePayload?.statusCode,
    details: responsePayload ?? axiosError.toJSON(),
    fieldErrors: createFieldErrorMap(messages),
    isNetworkError: !axiosError.response,
  })
}

async function requestWithFallback<TResponse, TData = unknown>({
  method,
  endpoint,
  data,
  params,
  headers,
  includeControllerApiPrefix,
}: RequestOptions<TData>): Promise<TResponse> {
  const pathVariants = buildPathVariants(endpoint, includeControllerApiPrefix)
  let lastError: ApiError | null = null

  for (const url of pathVariants) {
    try {
      const response = await apiClient.request<TResponse>({
        method,
        url,
        data,
        params,
        headers,
      } as AxiosRequestConfig<TData>)

      return response.data
    } catch (requestError) {
      const normalizedError = normalizeApiError(requestError)
      lastError = normalizedError

      if (normalizedError.statusCode === 404 && url !== pathVariants[pathVariants.length - 1]) {
        continue
      }

      throw normalizedError
    }
  }

  throw lastError ??
    new ApiError({
      message: DEFAULT_API_REQUEST_ERROR,
      fieldErrors: {},
      isNetworkError: false,
    })
}

function normalizeSignedUrlResponse(response: unknown): string | null {
  if (typeof response === 'string') {
    return response
  }

  if (response && typeof response === 'object') {
    const candidate = (response as { url?: unknown }).url
    if (typeof candidate === 'string') {
      return candidate
    }
  }

  return null
}

export function normalizeDecimal(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export function getApiErrorMessage(error: unknown): string {
  return normalizeApiError(error).message
}

export function getApiFieldErrors(error: unknown): Record<string, string> {
  return normalizeApiError(error).fieldErrors
}

export const apiClient = createApiClient(BASE_API_URL)

export async function fetchSplitById(splitId: string): Promise<ApiSplitRecord> {
  return requestWithFallback<ApiSplitRecord>({
    method: 'get',
    endpoint: `/splits/${splitId}`,
  })
}

export async function updateSplit(
  splitId: string,
  payload: Partial<Pick<ApiSplitRecord, 'totalAmount' | 'description' | 'preferredCurrency' | 'status'>>,
): Promise<ApiSplitRecord> {
  return requestWithFallback<ApiSplitRecord, typeof payload>({
    method: 'patch',
    endpoint: `/splits/${splitId}`,
    data: payload,
  })
}

export async function createSplit(
  payload: ApiCreateSplitPayload,
): Promise<ApiSplitRecord> {
  return requestWithFallback<ApiSplitRecord, ApiCreateSplitPayload>({
    method: 'post',
    endpoint: '/splits',
    data: payload,
  })
}

export async function fetchSplitPayments(
  splitId: string,
): Promise<ApiPaymentRecord[]> {
  return requestWithFallback<ApiPaymentRecord[]>({
    method: 'get',
    endpoint: `/payments/split/${splitId}`,
  })
}

export async function fetchSplitPaymentStats(
  splitId: string,
): Promise<ApiPaymentStats> {
  return requestWithFallback<ApiPaymentStats>({
    method: 'get',
    endpoint: `/payments/stats/${splitId}`,
  })
}

export async function submitSplitPayment(payload: {
  splitId: string
  participantId: string
  stellarTxHash: string
  idempotencyKey?: string
  externalReference?: string
}): Promise<{
  success: boolean
  message: string
  paymentId?: string
  isDuplicate?: boolean
  idempotencyKey?: string
}> {
  return requestWithFallback({
    method: 'post',
    endpoint: '/payments/submit',
    data: payload,
  })
}

export async function fetchSplitReceipts(
  splitId: string,
): Promise<ApiReceiptRecord[]> {
  return requestWithFallback<ApiReceiptRecord[]>({
    method: 'get',
    endpoint: `/receipts/split/${splitId}`,
    includeControllerApiPrefix: true,
  })
}

export async function uploadReceiptForSplit(
  splitId: string,
  file: File,
): Promise<ApiReceiptRecord> {
  const formData = new FormData()
  formData.append('file', file)

  return requestWithFallback<ApiReceiptRecord, FormData>({
    method: 'post',
    endpoint: `/receipts/upload/${splitId}`,
    data: formData,
    headers: {
      Accept: 'application/json',
    },
    includeControllerApiPrefix: true,
  })
}

export async function fetchReceiptSignedUrl(receiptId: string): Promise<string | null> {
  const response = await requestWithFallback<unknown>({
    method: 'get',
    endpoint: `/receipts/${receiptId}/signed-url`,
    includeControllerApiPrefix: true,
  })

  return normalizeSignedUrlResponse(response)
}

export async function fetchReceiptOcrData(
  receiptId: string,
): Promise<ApiReceiptOcrResponse> {
  return requestWithFallback<ApiReceiptOcrResponse>({
    method: 'get',
    endpoint: `/receipts/${receiptId}/ocr-data`,
    includeControllerApiPrefix: true,
  })
}

export async function createItem(payload: {
  splitId: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  assignedToIds: string[]
}): Promise<ApiSplitItem> {
  return requestWithFallback<ApiSplitItem, typeof payload>({
    method: 'post',
    endpoint: '/items',
    data: payload,
  })
}

export async function deleteItem(itemId: string): Promise<void> {
  await requestWithFallback<void>({
    method: 'delete',
    endpoint: `/items/${itemId}`,
  })
}

export async function fetchProfile(walletAddress: string): Promise<ApiProfile | null> {
  try {
    return await requestWithFallback<ApiProfile>({
      method: 'get',
      endpoint: `/profile/${walletAddress}`,
    })
  } catch (error) {
    const apiError = normalizeApiError(error)
    if (apiError.statusCode === 404) {
      return null
    }
    throw apiError
  }
}

export async function fetchDashboardSummary(): Promise<ApiDashboardSummary> {
  return requestWithFallback<ApiDashboardSummary>({
    method: 'get',
    endpoint: '/dashboard/summary',
  })
}

export async function fetchDashboardActivity(
  page = 1,
  limit = 10,
): Promise<ApiDashboardActivityResponse> {
  return requestWithFallback<ApiDashboardActivityResponse>({
    method: 'get',
    endpoint: '/dashboard/activity',
    params: {
      page,
      limit,
    },
  })
}

export async function fetchUserActivities(
  userId: string,
  params?: {
    splitId?: string
    limit?: number
    page?: number
    isRead?: boolean
  },
): Promise<{
  data: ApiActivityRecord[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasMore: boolean
  unreadCount: number
}> {
  return requestWithFallback({
    method: 'get',
    endpoint: `/activities/${userId}`,
    params,
  })
}

export async function createActivityRecord(
  payload: ApiCreateActivityPayload,
): Promise<ApiActivityRecord> {
  return requestWithFallback<ApiActivityRecord, ApiCreateActivityPayload>({
    method: 'post',
    endpoint: '/activities',
    data: payload,
  })
}
