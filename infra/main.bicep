@description('Azure region for all resources')
param location string

@secure()
@description('Password for the PostgreSQL container')
param postgresPassword string

@description('API container image (overridden by CI/CD after first deploy)')
param apiImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Worker container image (overridden by CI/CD after first deploy)')
param workerImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

var uniqueSuffix = uniqueString(resourceGroup().id)
var acrName = 'acrdatahub${uniqueSuffix}'
var environmentName = 'cae-datahub-settlement'
var useAcr = apiImage != 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

// Log Analytics Workspace (required by Container Apps Environment)
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-datahub-settlement'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Azure Container Registry
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// Container Apps Environment
resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// Container App: PostgreSQL
resource postgresql 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'postgresql'
  location: location
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      ingress: {
        external: false
        targetPort: 5432
        transport: 'tcp'
      }
    }
    template: {
      containers: [
        {
          name: 'postgresql'
          image: 'timescale/timescaledb:latest-pg16'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'POSTGRES_DB', value: 'datahub_settlement' }
            { name: 'POSTGRES_USER', value: 'settlement' }
            { name: 'POSTGRES_PASSWORD', value: postgresPassword }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

// Container App: API + React SPA
resource api 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'api'
  location: location
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
        transport: 'http'
      }
      registries: useAcr ? [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ] : []
      secrets: useAcr ? [
        {
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
      ] : []
    }
    template: {
      containers: [
        {
          name: 'api'
          image: apiImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'ConnectionStrings__SettlementDb'
              value: 'Host=postgresql;Port=5432;Database=datahub_settlement;Username=settlement;Password=${postgresPassword}'
            }
          ]
          probes: [
            {
              type: 'Startup'
              httpGet: {
                path: '/health'
                port: 8080
              }
              initialDelaySeconds: 5
              periodSeconds: 5
              failureThreshold: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 2
        rules: [
          {
            name: 'http-scale'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

// Container App: Worker (background service)
resource worker 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'worker'
  location: location
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      registries: useAcr ? [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ] : []
      secrets: useAcr ? [
        {
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
      ] : []
    }
    template: {
      containers: [
        {
          name: 'worker'
          image: workerImage
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'ConnectionStrings__SettlementDb'
              value: 'Host=postgresql;Port=5432;Database=datahub_settlement;Username=settlement;Password=${postgresPassword}'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

output acrLoginServer string = acr.properties.loginServer
output acrName string = acr.name
output apiUrl string = 'https://${api.properties.configuration.ingress.fqdn}'
