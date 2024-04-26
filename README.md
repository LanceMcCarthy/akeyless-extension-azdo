# AKeyless Extension for Azure DevOps

Use this Azure DevOps extension to safely retrieve and use secrets from your AKeyless vault. The task will login to AKeyless using Azure service connection JWT authentication and then fetch static secrets or a dynamic secret producer.

  - [Getting Started](#getting-started)
  - [Inputs](#inputs)
  - [Outputs](#outputs)
  - [Static Secrets](#static-secrets)
  - [Dynamic Secrets Output](#dynamic-secrets-output)

## Getting Started

If this is your first time using the extension, please visit the dedicated documentation to have the required prerequisites prepared.

- [Getting Started](https://github.com/LanceMcCarthy/akeyless-extension-azdo/blob/main/docs/getting-started.md) - Setup akeyless and Azure service principal
- [Example (Tutorial)](https://github.com/LanceMcCarthy/akeyless-extension-azdo/blob/main/docs/examples.md) - Complete walkthough demo

## Inputs

| Name | Required | Type | Value |
|------|----------|------|-------|
| accessId | Yes | `string`  | The access id for your auth method, see [Getting Started - Akeyless Setup ()](https://github.com/LanceMcCarthy/akeyless-extension-azdo/blob/main/docs/getting-started.md#akeyless-setup) |
| azureJwt  | Yes | `string`  | This is the JWT token to authenticate with Akeyless, see [Getting Started - Azure Setup](https://github.com/LanceMcCarthy/akeyless-extension-azdo/blob/main/docs/getting-started.md#azure-setup) |
| staticSecrets | No | `string` | A JSON object as a string, with a list of static secrets to fetch/export. The key should be the path to the secret and the value should be the name of the environment variable/output to save it to. **See examples**. |
| dynamicSecrets | No | `string` | A JSON object as a string, with a list of dynamic secrets to fetch/export. The key should be the path to the secret and the value should be the name of the environment variable/output to save it to. **See examples**. |

> [!IMPORTANT]
> When defining the secrets, you need to make sure the input's format is correct. For example, a single secret would be `{"/path/to/secret":"my_secret" }` or for multiple secrets `{"/path/to/first-secret":"first_secret", "/path/to/second-secret":"second_secret" }`.

## Outputs

The task's outputs are determined by the values set in your `staticSecrets` and `dynamicSecrets` inputs and are reference using the task's `id` value. Whatever you have set for the secret's names will be turned into output variables for the task.

```powershell
# To get the output, you only need the ID of the task and the output variable's name
$(Task_ID.VARIABLE_NAME)
```

> [!WARNING]
> If you are using classic pipelines, it is **critical** that you set the `Reference Name` setting of the task in your pipeline, this becomes the TASK_ID in the example above (YAML pipelines let you set the `id` directly).

![reference name](https://github.com/LanceMcCarthy/akeyless-extension-azdo/assets/3520532/ffa9c867-33b3-42a3-ba0d-23c111ca153d)

## Static Secrets

For static secrets, you will get an individual secret output variables for each secret. For example:

```yaml
steps:
- task: AzureCLI@2
  id: 'AzureCLI'
  displayName: AzureCLI
  inputs:
    azureSubscription: 'My Azure Service Principal'
    scriptType: ps
    scriptLocation: inlineScript
    inlineScript: |
     $JWT=$(az account get-access-token --query accessToken --output tsv)
     echo "##vso[task.setvariable variable=azure_jwt;isoutput=true;issecret=true]$JWT"

- task: LancelotSoftware.akeylessExtensionAzdo@1
  displayName: MyAkeylessTask
  inputs:
    accessid: 'p-123456'
    azureJwt: '$(AzureCLI.azure_jwt)'
    staticSecrets: '{"/path/to/first-secret":"first_secret", "/path/to/second-secret":"second_secret" }'
```
Notice how we are using the `azure_jwt` output from the AzureCLI task to hold the JWT, then use it in the Akeyless task with `$(AzureCLI.azure_jwt)`.

You will have `$(MyAkeylessTask.first_secret)` and  `$(MyAkeylessTask.second_secret)` available in subsequent tasks of that job.

## Dynamic Secrets Output

For dynamic secret, it will only be a single variable. For example:

```yaml
steps:
- task: AzureCLI@2
  id: 'AzureCLI'
  displayName: AzureCLI
  inputs:
    azureSubscription: 'My Azure Service Principal'
    scriptType: ps
    scriptLocation: inlineScript
    inlineScript: |
     $FRESH_JWT=$(az account get-access-token --query accessToken --output tsv)
     echo "##vso[task.setvariable variable=azure_jwt;isoutput=true;issecret=true]$FRESH_JWT"

- task: LancelotSoftware.akeylessExtensionAzdo@1
  displayName: MyAkeylessTask
  inputs:
    accessid: 'p-123456'
    azureJwt: '$(AzureCLI.azure_jwt)'
    staticSecrets: '{"/path/to/dynamic/secret":"my_dynamic_secret"}'
```

Notice how we are using the `azure_jwt` output from the AzureCLI task to hold the JWT, then use it in the Akeyless task with `$(AzureCLI.azure_jwt)`.

You will have `$(MyAkeylessTask.my_dynamic_secret)` available in subsequent tasks of that job. Note that dynamic secrets tend to be large complex objects and you will likely need to further process the value to get an inner value. For example, using `jq`.
