# AKeyless Extension for Azure DevOps

Use this Azure DevOps extension to safely retrieve and use secrets from your AKeyless vault. The task will login to AKeyless using Azure service connection JWT authentication and then fetch static secrets or a dynamic secret producer.

- [AKeyless Extension for Azure DevOps](#akeyless-extension-for-azure-devops)
    - [Inputs](#inputs)
    - [Outputs](#outputs)
    - [Static Secrets Outputs](#static-secrets-outputs)
      - [Dynamic Secrets Output](#dynamic-secrets-output)
  - [AKeyless Setup](#akeyless-setup)
    - [Authentication Methods](#authentication-methods)
    - [Setting up JWT Auth](#setting-up-jwt-auth)
  - [Examples](#examples)

### Inputs

| Name | Required | Type | Value |
|------|----------|------|-------|
| accessId | Yes | `string`  | The access id for your auth method |
| azureJwt  | Yes | `string`  | This is the JWT you recieved in a previous step (e.g., `$JWT=$(az account get-access-token --query accessToken --output tsv)`) |
| staticSecrets | No | `string` | A JSON object as a string, with a list of static secrets to fetch/export. The key should be the path to the secret and the value should be the name of the environment variable/output to save it to. |
| dynamicSecrets | No | `string` | A JSON object as a string, with a list of dynamic secrets to fetch/export. The key should be the path to the secret and the value should be the name of the environment variable/output to save it to. |

### Outputs

The task's outputs are determined by the values set in your `statiSecrets` and `dynamicSecrets` inputs. Whatever you have set for the secrets names will be turned into pipeline secrets.

### Static Secrets Outputs

For static secrets, you will get an individual secret pipeline variable for each secret. For example:

```
{"/path/to/static/secret":"my_first_secret", "/path/to/another/secret":"my_second_secret"}
```

You will have `$(env.MY_FIRST_SECRET)` and  `$(env.MY_SECOND_SECRET)` available as a secret pipeline variables. 

#### Dynamic Secrets Output

For dynamic secret, it will only be a single variable. For example:

```
{"/path/to/dynamic/secret":"my_dynamic_secret"}
```

You will only have  `$(env.MY_FIRST_SECRET)` set as a secret pipeline variable in the runner after the task is complete.

## AKeyless Setup

### Authentication Methods

This action only supports authenticating to AKeyless via JWT auth (using the Azure DevOps OIDC token) or via IAM Auth (using a role attached to a cloud-hosted Azure DevOps agent).  I don't plan to support additional authentication methods because there isn't much point (with the possible exception of Universal Identity).  After all, any runner can login to AKeyless using OIDC without storing permanent access credentials.  IAM auth is also supported in case you are using a runner hosted in your cloud account and so are already using IAM auth anyway - this will also give your runner access to AKeyless without storing permanent access credentials.

### Setting up JWT Auth

To configure AKeyless and grant your repositories the necessary permissions to execute this action:

1. Create a new JWT Auth method in AKeyless if you don't have one (you can safely share the auth method between repositories)
    1. In AKeyless go to "Auth Methods" -> "+ New" -> "OAuth 2.0/JWT".
    2. Specify a name (e.g. "Azure JWT Auth") and location of your choice.
    3. For the JWKS Url, specify `https://login.microsoftonline.com/common/discovery/keys`
    4. For the unique identifier use `repository`. See note (1) below for more details.
    5. You **MUST** click "Require Sub Claim on role association".  This will prevent you from attaching this to a role without any additional checks. If you accidentally forgot to set subclaim checks, then any Pipeline owned by *anyone* would be able to authenticate to AKeyless and access your resources... **that make this a critical checkbox**. 
2. Create an appropriate access role (if you don't already have one)
    1. In AKeyless go to "Access Roles" -> "+ New"
    2. Give it a name and location, and create it.
    3. Find your new access role and click on it to edit it.
    4. On the right side, under "Secrets & Keys", click the "Add" button to configure read access to any static or dynamic secrets you will fetch from your pipeline.
3. Attach your Azure JWT Auth method to your role
    1. Once again, find the access role you created in step #2 above and click on it to edit it.
    2. Hit the "+ Associate" button to associate your "Azure JWT Auth" method with the role.
    3. In the list, find the auth method you created in Step #1 above.
    4. Add an appropriate sub claim, based on the claims available in the JWT. See note (2) below for more details.
    5. Save!

After following these steps, you'll be ready to use JWT Auth from your Azure DevOps

**(1) Note:** The unique identifier is mainly used for auditing/billing purposes, so there isn't one correct answer here.  `repository` is a sensible default but if you are uncertain, talk to AKeyless for more details.

**(2) Note:** Subclaim checks allow AKeyless to grant access to specific workflows, based on the claims that are provided in the JWT. If you aren't sure, check the entire JWT response for subclaims you could use in AKeyless (using example below).

```
# example parts of JWT that could be used for subclaim
repository=my-azdo-org/my-azdo-project
ref=refs/heads/main
```

## Examples

Here are some examples you can use for guidance:
