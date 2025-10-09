# AKeyless Extension for Azure DevOps

Use this Azure DevOps extension to safely retrieve and use secrets from your AKeyless vault. The task will login to AKeyless using Azure service connection JWT authentication and then fetch static secrets or a dynamic secret producer.

- [AKeyless Extension for Azure DevOps](#akeyless-extension-for-azure-devops)
  - [Getting Started](#getting-started)
  - [Inputs](#inputs)
  - [Outputs](#outputs)
    - [YAML Pipelines](#yaml-pipelines)
    - [Classic Pipelines](#classic-pipelines)
  - [Static Secrets](#static-secrets)
  - [Dynamic Secrets](#dynamic-secrets)
    - [Automatic Outputs](#automatic-outputs)
    - [Plain Output](#plain-output)
    - [Processing Simple Output](#processing-simple-output)
      - [Example 1. Using jq](#example-1-using-jq)
      - [Example 2. Using ConvertFrom-Json](#example-2-using-convertfrom-json)
  - [Support](#support)
 
> [!NOTE]
> Akeyless now has an official AzDO Task! I am committed to maintaining this one, but now you have a choice :) See their docs for setup info => [akeyless-azure-devops-extension](https://docs.akeyless.io/docs/akeyless-azure-devops-extension).

## Getting Started

You can add the extension to your Azure DevOps pipeline in one of two ways:

- Option 1 - Search for 'akeyless secrets' when adding a new task.
- Option 2 - Go to [Akeyless Extensions - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=LancelotSoftware.akeyless-extensions)

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
$(MyAkeylessTask.my_output)
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
    staticSecrets: '{"/path/to/first-secret":"first_secret", "/path/to/second-secret":"second_secret" }'
```
Notice how we are using the `azure_jwt` output from the AzureCLI task to hold the JWT, then use it in the Akeyless task with `$(AzureCLI.azure_jwt)`.

You will have `$(MyAkeylessTask.first_secret)` and  `$(MyAkeylessTask.second_secret)` available in subsequent tasks of that job.

## Dynamic Secrets

For dynamic secrets, the outputs are available as both individual outputs and the entire value.

- [Automatic Output](#automatic-outputs)
- [Plain Output](#plain-output)

### Automatic Outputs

By default, the dynamic secret will be parsed into a separate output for every value in the secret. This fully supports any number of nested levels, each level uses its parent key to avoid key conflicts.

For example, if the secret is  `{"id": "-","person": { "username": "-", "password": "-"},"expiration": "-"}` these these outputs are autmatically generated for you:

- `id` 
- `person_username` 
- `person_password` 
- `expiration`

Using the automatic outputs is just as easy as using static secrets, every output variable is directly accessible using the generated key name.

```powershell
Write-Output "Id: $(MyAkeylessTask.id)"
Write-Output "Person_Username: $(MyAkeylessTask.person_username)"
Write-Output "Person_Password: $(MyAkeylessTask.person_password)"
Write-Output "Expires: $(MyAkeylessTask.expiration)"
```

This is recursive, concatenating the `parentkey_childkey` and each level separated with underscores. It can go as deep as it needs to. 

> [!WARNING]
> If you requesting multiple dynamic secrets in the same task, and the same key exists in multiple dynamic secret responses (e.g. `id`), that key's value will be overwritten on each fetch. **Solution**: Use a separate task for each dynamic secret in this situation.

### Plain Output

The entire secret's value is produced within in the output variable you named when setting the secret. For example, here we've requested the output variable's name to be `secret_1`

```yaml
- task: akeyless-secrets@1
  name: 'MyAkeylessTask'
  displayName: 'Get Secrets from Akeyless'
  inputs:
    accessid: 'p-123456'
    azureJwt: '$(AzureCLI.azure_jwt)'
    dynamicSecrets: '{"/first-dynamic-secret":"secret_1"}'
```

Now you'll have the entire response's value in the `$(MyAkeylessTask.secret_1)` output. However you will need ot manually parse it, 

### Processing Simple Output

If you have chosen to skip automatic output generation, or need to use the entire value.

Note that dynamic secrets tend to be complex objects and you will likely need to further process the value to get an inner value. This topic is outside the scope of this Task, Copilot can assist you with writing the parsing logic.

For now, here are a couple examples.

#### Example 1. Using jq

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

#### Example 2. Using ConvertFrom-Json

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

> [!NOTE]
> Depending on your secret's content, you may or may not need the `-AsHashtable` switch, see [Example 5 in the Microsoft docs](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/convertfrom-json?view=powershell-7.5#example-4-convert-a-json-string-to-a-hash-table).

## Support

Please open a new issue on GitHub for bug report or feature requests.
