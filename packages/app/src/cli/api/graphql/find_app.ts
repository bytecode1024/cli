import {gql} from 'graphql-request'

export const FindAppQuery = gql`
  query FindApp($apiKey: String!) {
    app(apiKey: $apiKey) {
      id
      title
      apiKey
      organizationId
      apiSecretKeys {
        secret
      }
      appType
      grantedScopes
      betas {
        unifiedAppDeployment
      }
      applicationUrl
      redirectUrlWhitelist
      webhookApiVersion
      gdprWebhooks {
        customerDeletionUrl
        customerDataRequestUrl
        shopDeletionUrl
      }
      embedded
      posEmbedded
      preferencesUrl
    }
  }
`

export interface FindAppQuerySchema {
  app: {
    id: string
    title: string
    apiKey: string
    organizationId: string
    apiSecretKeys: {
      secret: string
    }[]
    appType: string
    grantedScopes: string[]
    betas?: {
      unifiedAppDeployment?: boolean
    }
    applicationUrl: string
    redirectUrlWhitelist: string[]
    webhookApiVersion?: string
    gdprWebhooks?: {
      customerDeletionUrl?: string
      customerDataRequestUrl?: string
      shopDeletionUrl?: string
    }
    embedded: boolean
    posEmbedded: boolean
    preferencesUrl?: string
  }
}
