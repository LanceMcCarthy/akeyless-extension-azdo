# AKeyless Extension for Azure DevOps

Use this Azure DevOps extension to safely retrieve and use secrets from your AKeyless vault. The task will login to AKeyless using Azure service connection JWT authentication and then fetch static secrets or a dynamic secret producer.

- [AKeyless Extension for Azure DevOps](#akeyless-extension-for-azure-devops)
  - [Getting Started](#getting-started)
  - [Inputs](#inputs)
  - [Outputs](#outputs)
    - [YAML Pipelines](#yaml-pipelines)
    - [Classic Pipelines](#classic-pipelines)
    - [Accessing the Output](#accessing-the-output)
  - [Static Secrets](#static-secrets)
  - [Dynamic Secrets](#dynamic-secrets)

## Getting Started

You can add the extension to your Azure DevOps pipeline in one of two ways:

- Option 1 - Search for 'akeyless secrets' when adding a new task.
- Option 2 - Go to [Akeyless Extensions - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=LancelotSoftware.akeyless-extensions)

If this is your first time using the extension, please visit the documentation to have the required prerequisites prepared.

- [Getting Started](https://github.com/LanceMcCarthy/akeyless-extension-azdo/blob/main/docs/getting-started.md) - Setup akeyless and Azure service principal
- [Example (Tutorial)](https://github.com/LanceMcCarthy/akeyless-extension-azdo/blob/main/docs/examples.md) - Complete walkthough demo

## Inputs

| Name | Required | Type | Value |
|------|----------|------|-------|
| `accessId` | Yes | `string`  | The access id for your auth method, see [Getting Started: Akeyless Setup (step 1.6)](https://github.com/LanceMcCarthy/akeyless-extension-azdo/blob/main/docs/getting-started.md#akeyless-setup) |
| `azureJwt`  | Yes | `string`  | This is the JWT token to authenticate with Akeyless, see [Getting Started: Azure Setup](https://github.com/LanceMcCarthy/akeyless-extension-azdo/blob/main/docs/getting-started.md#azure-setup) |
| `staticSecrets` | No | `string` | Static secrets to fetch from AKeyless. This must be a dictionary object, where the 'key' is the secret's path in akeyless and the 'value' is what you want the output variable to be named. **See important note below**. |
| `dynamicSecrets` | No | `string` | Dynamic secret to fetch from AKeyless. This must be a dictionary object, where the 'key' is the secret's path in akeyless and the 'value' is what you want the output variable to be named. **See important note below**. |
| `apiUrl` | No | `string`  | Overrides the URL to the akeyless API server. Warning - Do not set this unless you know what you're doing! |

> [!IMPORTANT]
> When defining the secrets, you need to make sure the input's format is correct. For example, a single secret would be `{"/path/to/secret":"my_secret" }` or for multiple secrets `{"/path/to/first-secret":"first_secret", "/path/to/second-secret":"second_secret" }`.

## Outputs

The task's outputs are determined by the values set in your `staticSecrets` and `dynamicSecrets` inputs. In order to access these outputs, you need to set the **reference name** of the task.

### YAML Pipelines

When writing the task in YAML, you set the reference name using the `name` property:

```yml
- task: akeyless-secrets@1
  name: 'MyAkeylessTask'
  displayName: 'Only the task's Display Name'
```

### Classic Pipelines

If you are using classic pipelines, you will find the  `Reference Name` setting under the Output Variables section:

![ref name](https://github.com/LanceMcCarthy/akeyless-extension-azdo/assets/3520532/a7109870-2660-43f2-9878-42ee6f1dfe6a)

### Accessing the Output

Now with the reference name, you can access the output(s):

```powershell
$(MyAkeylessTask.my_output)
```

## Static Secrets

For static secrets, you will get an individual secret output variables for each secret. For example:

```yaml
steps:
- task: AzureCLI@2
  name: 'AzureCLI'
  displayName: 'Get JWT from Azure'
  inputs:
    azureSubscription: 'My Azure Service Principal'
    scriptType: ps
    scriptLocation: inlineScript
    inlineScript: |
     $JWT=$(az account get-access-token --query accessToken --output tsv)
     echo "##vso[task.setvariable variable=azure_jwt;isoutput=true;issecret=true]$JWT"

- task: akeyless-secrets@1
  name: 'MyAkeylessTask'
  displayName: 'Get Secrets from Akeyless'
  inputs:
    accessid: 'p-123456'
    azureJwt: '$(AzureCLI.azure_jwt)'
    staticSecrets: '{"/path/to/first-secret":"first_secret", "/path/to/second-secret":"second_secret" }'
```
Notice how we are using the `azure_jwt` output from the AzureCLI task to hold the JWT, then use it in the Akeyless task with `$(AzureCLI.azure_jwt)`.

You will have `$(MyAkeylessTask.first_secret)` and  `$(MyAkeylessTask.second_secret)` available in subsequent tasks of that job.

## Dynamic Secrets

For dynamic secrets, the output variable that holds all of that dynamic secret's output. For example:

```yaml
steps:
- task: AzureCLI@2
  name: 'AzureCLI'
  displayName: 'Get JWT from Azure'
  inputs:
    azureSubscription: 'My Azure Service Principal'
    scriptType: ps
    scriptLocation: inlineScript
    inlineScript: |
     $FRESH_JWT=$(az account get-access-token --query accessToken --output tsv)
     echo "##vso[task.setvariable variable=azure_jwt;isoutput=true;issecret=true]$FRESH_JWT"

# We are using $(AzureCLI.azure_jwt)
- task: akeyless-secrets@1
  name: 'MyAkeylessTask'
  displayName: 'Get Secrets from Akeyless'
  inputs:
    accessid: 'p-123456'
    azureJwt: '$(AzureCLI.azure_jwt)'
    staticSecrets: '{"/path/to/dynamic/secret":"my_dynamic_secret"}'
```

You will have `$(MyAkeylessTask.my_dynamic_secret)` available in subsequent tasks of that job. Note that dynamic secrets tend to be complex objects and you will likely need to further process the value to get an inner value.

For example, with a SQL dynamics secret you you can use `jq` to get at each separate value.

```
echo '$(MyAkeylessTask.MY_SQL_DYNAMIC_SECRET)' | jq -r 'to_entries|map("SQL_\(.key|ascii_upcase)=\(.value|tostring)")|.[]' >> $SQL

echo $SQL.id
echo $SQL.user
echo $SQL.ttl_in_minutes
echo $SQL.password
```
