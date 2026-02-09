# AKeyless Extension for Azure DevOps 

Use this Azure DevOps extension to safely retrieve and use secrets from your AKeyless vault. The task will login to AKeyless using Azure service connection JWT authentication and then fetch static secrets or a dynamic secret producer.

- [AKeyless Extension for Azure DevOps](#akeyless-extension-for-azure-devops)
  - [Installation](#installation)
  - [Getting Started](#getting-started)
  - [Inputs](#inputs)
  - [Reference Outputs](#outputs) ([YAML](#yaml-pipelines) or [Classic](#classic-pipelines))
  - [Static Secrets](#static-secrets)
  - [Dynamic Secrets](#dynamic-secrets)
    - [Automatic Outputs](#automatic-outputs) ([examples](#automatic-output-examples))
    - [Plain Output](#plain-output) ([examples](#simple-output-examples))
  - [Support](#support)
 
>  I am 100% committed to maintaining this and update it monthly, however I should mention that Akeyless now has their own, see [Akeyless AzDO Extension](https://docs.akeyless.io/docs/akeyless-azure-devops-extension).

## Status

| Workflow | Status |
|---|---|
| Main | [![Main - Tests](https://github.com/LanceMcCarthy/akeyless-extension-azdo/actions/workflows/main.yml/badge.svg)](https://github.com/LanceMcCarthy/akeyless-extension-azdo/actions/workflows/main.yml) |
| Publish | [![Publish Release](https://github.com/LanceMcCarthy/akeyless-extension-azdo/actions/workflows/releases.yml/badge.svg)](https://dev.azure.com/lance/DevOps%20Examples/_build?definitionId=82&_a=summary) |
| Proof Pipeline | [![Build Status](https://dev.azure.com/lance/DevOps%20Examples/_apis/build/status%2FLanceMcCarthy.akeyless-extension-azdo?branchName=main)](https://dev.azure.com/lance/DevOps%20Examples/_build/latest?definitionId=82&branchName=main) |

## Installation

You can add the extension to your Azure DevOps pipeline in one of two ways:

- Option 1 - Search for 'akeyless secrets' when adding a new task.
- Option 2 - Go to [Akeyless Extensions - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=LancelotSoftware.akeyless-extensions)

## Getting Started

If this is your first time using the extension, please visit the documentation to have the required prerequisites prepared.

- [Getting Started](https://github.com/LanceMcCarthy/akeyless-extension-azdo/blob/main/docs/getting-started.md) - Setup akeyless and Azure service principal
- [Example (Tutorial)](https://github.com/LanceMcCarthy/akeyless-extension-azdo/blob/main/docs/examples.md) - Complete walkthough demo

## Inputs

| Name | Required | Type | Value | Default |
|------|----------|------|-------|---------|
| `accessId` | Yes | `string`  | The access id for your auth method, see [Getting Started: Akeyless Setup (step 1.6)](https://github.com/LanceMcCarthy/akeyless-extension-azdo/blob/main/docs/getting-started.md#akeyless-setup) | null |
| `azureJwt`  | Yes | `string`  | This is the JWT token to authenticate with Akeyless, see [Getting Started: Azure Setup](https://github.com/LanceMcCarthy/akeyless-extension-azdo/blob/main/docs/getting-started.md#azure-setup) | null |
| `staticSecrets` | No | `string` | Static secrets to fetch from AKeyless. This must be a dictionary object, where the 'key' is the secret's path in akeyless and the 'value' is what you want the output variable to be named. **See important note below**. | null |
| `dynamicSecrets` | No | `string` | Dynamic secret to fetch from AKeyless. This must be a dictionary object, where the 'key' is the secret's path in akeyless and the 'value' is what you want the output variable to be named. **See important note below**. | null |
| `apiUrl` | No | `string`  | Overrides the URL to the akeyless API server. Warning - Do not set this unless you know what you're doing! | `https://api.akeyless.io` |
| `timeout` | No | `Number`  | Overrides the default gateway request timeout of 15 seconds. | `15` |
| `autogenerate` | No | `Boolean`  | Automatically create output variables for dynamic secrets. | `true` |

> [!IMPORTANT]
> - When defining the secrets, you need to make sure the input's format is correct. For example, a single secret would be `{"/path/to/secret":"my_secret" }` or for multiple secrets `{"/path/to/first-secret":"first_secret", "/path/to/second-secret":"second_secret" }`.
> - To avoid PowerShell JSON parsing errors for dynamic secrets, use an env to pass the task's outputs. See the [Processing Plain Output](#processing-plain-output) examples.

## Outputs

The task's outputs are determined by the values set in your `staticSecrets` and `dynamicSecrets` inputs. In order to access these outputs, first you must set the **reference name** of the task.

### YAML Pipelines

When writing the task in YAML, you set the reference name using the `name` property:

```yml
- task: akeyless-secrets@1
  name: 'MyAkeylessTask'
  displayName: 'Only the task's Display Name'
```

### Classic Pipelines

If you are using classic pipelines, you will find the `Reference Name` setting under the Output Variables section:

![ref name](https://github.com/LanceMcCarthy/akeyless-extension-azdo/assets/3520532/a7109870-2660-43f2-9878-42ee6f1dfe6a)

Now with the reference name, you can access the output(s):

```powershell
$(MyAkeylessTask.name_of_output)
```

## Static Secrets

For static secrets, you will get an individual secret output variables for each secret. For example:

```yaml
steps:
# IMPORTANT - This task has a 'name' assigned.
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
    staticSecrets: '{"/path/to/first-secret":"firstSecret", "/path/to/second-secret":"secondSecret" }'
```
Notice how we are using the `azure_jwt` output from the AzureCLI task to hold the JWT, then use it in the Akeyless task with `$(AzureCLI.azure_jwt)`.

You will have `$(MyAkeylessTask.firstSecret)` and  `$(MyAkeylessTask.secondSecret)` available in subsequent tasks of that job.

## Dynamic Secrets

For dynamic secrets, the outputs are available as both individual outputs and the entire value.

- [Automatic Output](#automatic-outputs)
- [Plain Output](#plain-output)

### Automatic Outputs

By default, the dynamic secret will be parsed into a separate output for every value in the secret. This uses your requested prefix and is recursive, supporting any number of nested objects it needs.

For example, if your secret is  `{"id": "1","person": { "username": "foo", "password": "bar"},"expiration": "123"}`, then the following outputs will automatically generated for you.

- `prefix_` + `id` 
- `prefix_` + `person_username` 
- `prefix_` + `person_password` 
- `prefix_` + `expiration`

> [!Note]
> The `prefix` is the output variable name that you used when for that secret, see the [automatic output example](#automatic-output-examples) below or review the [azure-pipelines.yml](https://github.com/LanceMcCarthy/akeyless-extension-azdo/blob/main/azure-pipelines.yml) tester.

#### Automatic Output Examples

For example, here we are requesting the output variable name to be `secret1`.

```yaml
- task: akeyless-secrets@1
  name: 'MyAkeylessTask'
  displayName: 'Get Secrets from Akeyless'
  inputs:
    accessid: 'p-123456'
    azureJwt: '$(AzureCLI.azure_jwt)'
    dynamicSecrets: '{"/first-dynamic-secret":"secret1"}'
```

As a result, you will have the following outputs available:

```powershell
Write-Output "Id: $(MyAkeylessTask.secret1_id)"
Write-Output "Person_Username: $(MyAkeylessTask.secret1_person_username)"
Write-Output "Person_Password: $(MyAkeylessTask.secret1_person_password)"
Write-Output "Expires: $(MyAkeylessTask.secret1_expiration)"
```

Here's a screenshot of multiple dynamic secrets being requested and then accessing the autogenerated outputs.

<img width="761" height="574" alt="image" src="https://github.com/user-attachments/assets/e42ae5ee-fe8b-459a-80ba-b856487167fb" />

### Plain Output

The entire secret's value is produced in the output name you requested. For example, here we are using `secret1` as the output name:

```yaml
- task: akeyless-secrets@1
  name: 'MyAkeylessTask'
  displayName: 'Get Secrets from Akeyless'
  inputs:
    accessid: 'p-123456'
    azureJwt: '$(AzureCLI.azure_jwt)'
    dynamicSecrets: '{"/first-dynamic-secret":"secret1"}'
```

The complete value name would be in the `secret1` output:

```powershell
Write-Output "COMPLETE JSON RESPONSE: $(MyAkeylessTask.secret1)"
```

> [!Caution]
> You need to carefully process this output, as PowerShell may throw errors while trying to convert JSON that has nested objects or quotes. See the exampels below for how to handle this situation using `env` for the output.

#### Simple Output Examples

It's important to rememebr when using the Simple Output option that dynamic secrets tend to be complex objects. You will likely need to further process the value to get to an inner value. This topic is outside the scope of this Task, I will share two examples, but GitHub Copilot is great with parsing logic.

##### Example 1. Using jq <!-- omit in toc -->

You can use `jq` to parse out the secret's parts.

```bash

- powershell: |
    # TIP: Using the env var to avoid issues with parens in the variable name
    echo $env:DYNAMIC_SECRET_JSON | jq -r 'to_entries|map("SQL_\(.key|ascii_upcase)=\(.value|tostring)")|.[]' >> $SQL
    echo $SQL.id
    echo $SQL.user
    echo $SQL.ttl_in_minutes
    echo $SQL.password
  displayName: 'Check Entra Id JSON output'
  env:
    DYNAMIC_SECRET_JSON: $(MyAkeylessTask.MY_SQL_DYNAMIC_SECRET)
```

##### Example 2. Using ConvertFrom-Json <!-- omit in toc -->

You can try PowerShell's `ConvertFrom-Json` function, which will create objects you can access through the property name:

```powershell
- powershell: |
    # TIP: Using the env var to avoid issues with parens in the variable name
    $SQL = $env:DYNAMIC_SECRET_JSON | ConvertFrom-Json
    Write-Output $SQL.id
    Write-Output $SQL.user
    Write-Output $SQL.ttl_in_minutes
    Write-Output $SQL.password
  displayName: 'Check Entra Id JSON output'
  env:
    DYNAMIC_SECRET_JSON: $(MyAkeylessTask.MY_SQL_DYNAMIC_SECRET)
```

## Support

Please open a new issue on GitHub for bug report or feature requests.
