export interface Organization {
  id: string
  businessName: string
  website?: string
}

export interface MinimalOrganizationApp {
  id: string
  title: string
  apiKey: string
}

export type OrganizationApp = MinimalOrganizationApp & {
  organizationId: string
  apiSecretKeys: {
    secret: string
  }[]
  appType?: string
  newApp?: boolean
  grantedScopes: string[]
  betas?: {
    unifiedAppDeployment?: boolean
    unifiedAppDeploymentOptIn?: boolean
  }
  applicationUrl: string
  redirectUrlWhitelist: string[]
  requestedAccessScopes?: string[]
  contactEmail?: string
  webhookApiVersion?: string
  embedded?: boolean
  posEmbedded?: boolean
  preferencesUrl?: string
  gdprWebhooks?: {
    customerDeletionUrl?: string
    customerDataRequestUrl?: string
    shopDeletionUrl?: string
  }
  appProxy?: {
    proxySubPath: string
    proxySubPathPrefix: string
    proxyUrl: string
  }
}

export interface OrganizationStore {
  shopId: string
  link: string
  shopDomain: string
  shopName: string
  transferDisabled: boolean
  convertableToPartnerTest: boolean
}
