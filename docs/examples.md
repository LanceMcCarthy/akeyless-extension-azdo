# Examples - Tutorial Walkthrough

Instead of a few disjoined examples, I thought it would be better to walk you through a tutorial that you can follow along with. This walkthrough will take you through:

1. Using the Azure CLI task to get a JWT token
2. Fetch secrets from Akeyless
3. Confirm the secrets were as expected

## Prerequisite

So that you can follow this tutorial exactly, in Akeyless, you want to create a new static secret in your personal vault.

- Set the secret's name to: `azdo-test-secret`
- Set the secret's value to: `These Are Not The Droids You Are Looking For`

![setting demo secret](https://github.com/LanceMcCarthy/akeyless-extension-azdo/assets/3520532/d10497ca-3cd6-4283-b10f-fb472c84c276)

> [!NOTE]
> Remember, the path to the secret depends on where you saved it. Since I put it in my personal vault, the path is `/personal-keys/mccarthy/azdo-test-secret`. Yours will have your name instead of 'mccarthy'. Keep this in mind if you copy/paste from the snippets!

## Task 1 - Azure CLI

To start the workflow, we need an Azure CLI Task to fetch a new short-lived JWT token. Since this is a sensitive value, we want to safely pass the JWT to a subsequent step.

This is done using the `##vso[task.setvariable]` command, which has three parameters:

- `variable` - this is the name of the variable
- `isoutput` - determines if the variable will be an output
- `issecret` - determines if the variable's value is a secret

Here's how it is used:

```powershell
# Step 1 - Get a short-lived JWT from the Azure service principal
$JWT=$(az account get-access-token --query accessToken --output tsv)

# Step 2 - set the JWT as a secret output variable
# the variable's name is set to "azure_jwt", then isoutput=true, and issecret=true
echo "##vso[task.setvariable variable=azure_jwt;isoutput=true;issecret=true]$JWT"
```

Therefore, here is what the full task should look like:

```yml
- task: AzureCLI@2
  name: 'AzureCLI'
  displayName: 'Get JWT from Azure'
  inputs:
    azureSubscription: 'Your-Service-Principal-Name-Goes-Here'
    scriptType: ps
    scriptLocation: inlineScript
    inlineScript: |
     # 1. Get JWT
     $JWT=$(az account get-access-token --query accessToken --output tsv)

     # 2. Set the JWT as a secret output variable
     echo "##vso[task.setvariable variable=azure_jwt;isoutput=true;issecret=true]$JWT"
```

## Task 2 - The Akeyless Task

Now, we can use the JWT token to authenticate with Akeyless. Let's add the Akeyless Task and provide three things:

- The Akeyless Auth Method's `access-id` (seen in [Getting Started - Akeyless Setup](/docs/getting-started.md#akeyless-setup) - **Step 1**).
- The JWT token from Task 1.
- The secrets you want to fetch from Akeyless

Remember, the path to the secret in akeyless is `/personal-keys/mccarthy/azdo-test-secret`. In the snippet below, I have chosen `OBI_WAN` to be the name for the output, but you can use any valid string (A-Z, a-z, 0-9, -, _).

```yml
- task: akeyless-secrets@1
  name: 'Akeyless1'
  displayName: 'Get Secrets from Akeyless'
  inputs:
    accessid: 'p-123456'
    azureJwt: '$(AzureCLI.azure_jwt)'
    staticSecrets: '{"/personal-keys/mccarthy/azdo-test-secret":"OBI_WAN" }'
```

> [!WARNING]
> If you are using classic pipelines, it is **critical** that you set the `Reference Name` setting of the task in your pipeline, this will be used to reference your outputs instead of an `id` that YAML pipelines have.

![reference name](https://github.com/LanceMcCarthy/akeyless-extension-azdo/assets/3520532/ffa9c867-33b3-42a3-ba0d-23c111ca153d)


## Task 3 - Verifying the Secret

Since this is a sample, and we know the value that we are expecting from Akeyless, we can have a little fun with checking the value:

```yaml
- name: "Verify Jedi Status"
  powershell: |
    # Te secret output fomr the Akeyless
    $passphrase = "$(Akeyless1.OBI_WAN)"

    # This is what we are expecting
    $expected = "These Are Not The Droids You Are Looking For"

    # to finish this demo, lets verify they match to prove everything is working
    if ($passphrase -eq $expected){
        echo "The passphrase matches, welcome Jedi"
    }
    else{
        echo "Sorry, no match... you must be a Sith!"
    }
```

### Combined

Here's what all the steps look like together

```YAML
steps:
- task: AzureCLI@2
  name: 'AzureCLI'
  displayName: 'Get JWT from Azure'
  inputs:
    azureSubscription: 'Your-Service-Principal-Name-Goes-Here'
    scriptType: ps
    scriptLocation: inlineScript
    inlineScript: |
     $JWT=$(az account get-access-token --query accessToken --output tsv)
     echo "##vso[task.setvariable variable=azure_jwt;isoutput=true;issecret=true]$JWT"

- task: akeyless-secrets@1
  name: 'Akeyless1'
  displayName: 'Get Secrets from Akeyless'
  inputs:
    accessid: 'p-123456'
    azureJwt: '$(AzureCLI.azure_jwt)'
    staticSecrets: '{"/personal-keys/mccarthy/azdo-test-secret":"OBI_WAN" }'

- name: "Verify Jedi Status"
  powershell: |
    $passphrase = "$(Akeyless1.OBI_WAN)"
    $expected = "These Are Not The Droids You Are Looking For"
    if ($passphrase -eq $expected){
        echo "The passphrase matches, welcome Jedi"
    }
    else{
        echo "Sorry, no match... you must be a Sith!"
    }
```

and finally, after you run the pipeline, the output of the Verify task will be:

![final outcome](https://github.com/LanceMcCarthy/akeyless-extension-azdo/assets/3520532/683a15d8-0728-40d9-9ea8-2fd9359f8190)

## Conclusion & Real World Example

In the real-world, you would not be using that "verify jedi status" step that leaks your secret in plain text. So, to share a real example, here's what it would look like to set a private nuget server's package source credentials using two separate static secrets.

```yaml
- task: akeyless-secrets@1
  name: 'Akeyless1'
  displayName: 'Get Secrets from Akeyless'
  inputs:
    accessid: 'p-123456'
    azureJwt: '$(AzureCLI.azure_jwt)'
    staticSecrets: '{"/path/to/secrets/TELERIK_USERNAME":"TELERIK_ACCOUNT_USERNAME", "/path/to/secrets/TELERIK_PASSWORD":"TELERIK_ACCOUNT_PASSWORD" }'

- displayName: 'Set nuegt.telerik.com Package Source Credentials'
  powershell: |
    script: dotnet nuget update source 'Telerik_Feed' --source 'https://nuget.telerik.com/v3/index.json' --configfile 'src\NuGet.Config' --username '$(Akeyless1.TELERIK_ACCOUNT_USERNAME)' --password '$(Akeyless1.TELERIK_ACCOUNT_PASSWORD)' --store-password-in-clear-text
```
