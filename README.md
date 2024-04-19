# AKeyless Extension for Azure DevOps

Use this Azure DevOps extension to safely retrieve and use secrets from your AKeyless vault. The task will login to AKeyless using JWT or IAM authentication and then fetch secrets and/or provision AWS access via a dynamic producer.

- [AKeyless Extension for Azure DevOps](#akeyless-extension-for-azure-devops)
    - [Inputs](#inputs)
    - [Outputs](#outputs)
    - [Static Secrets Outputs](#static-secrets-outputs)
      - [Dynamic Secrets Output](#dynamic-secrets-output)
    - [Job Permissions Requirement](#job-permissions-requirement)
  - [AKeyless Setup](#akeyless-setup)
    - [Authentication Methods](#authentication-methods)
    - [Setting up JWT Auth](#setting-up-jwt-auth)
  - [Example](#example)

### Inputs

| Name | Required | Type | Value |
|------|----------|------|-------|
| accessId | Yes | string  | The access id for your auth method |
| accessType  | No | `string`  | The login method to use.  Must be `jwt` or `aws_iam`.  Defaults to `jwt` |
| apiUrl | No | `string`  | The API endpoint to use.  Defaults to `https://api.akeyless.io` |
| producerForAwsAccess | No | `string`  | Path to an AWS dynamic producer.  If provided, AWS credentials will be fetched from it and exported to the environment |
| staticSecrets | No | `string` | A JSON object as a string, with a list of static secrets to fetch/export.  The key should be the path to the secret and the value should be the name of the environment variable/output to save it to. |
| dynamicSecrets | No | `string` | A JSON object as a string, with a list of dynamic secrets to fetch/export.  The key should be the path to the secret and the value should be the name of the environment variable/output to save it to. |

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


### Job Permissions Requirement

The default usage relies on using the GitHub JWT to login to AKeyless.  To make this available, you have to configure it in your job workflow:

```
jobs:
  my_job:
    #---------Required---------#
    permissions: 
      id-token: write
      contents: read
    #--------------------------#
```
> If this is not present, the akeyless-action step will fail with the following error `Failed to login to AKeyless: Error: Failed to fetch Github JWT: Error message: Unable to get ACTIONS\_ID\_TOKEN\_REQUEST\_URL env variable`

## AKeyless Setup

### Authentication Methods

This action only supports authenticating to AKeyless via JWT auth (using the Azure DevOps OIDC token) or via IAM Auth (using a role attached to a cloud-hosted Azure DevOps agent).  I don't plan to support additional authentication methods because there isn't much point (with the possible exception of Universal Identity).  After all, any runner can login to AKeyless using OIDC without storing permanent access credentials.  IAM auth is also supported in case you are using a runner hosted in your cloud account and so are already using IAM auth anyway - this will also give your runner access to AKeyless without storing permanent access credentials.

### Setting up JWT Auth

To configure AKeyless and grant your repositories the necessary permissions to execute this action:

1. Create a GitHub JWT Auth method in AKeyless if you don't have one (you can safely share the auth method between repositories)
    1. In AKeyless go to "Auth Methods" -> "+ New" -> "OAuth 2.0/JWT".
    2. Specify a name (e.g. "GitHub JWT Auth") and location of your choice.
    3. For the JWKS Url, specify `https://token.actions.githubusercontent.com/.well-known/jwks`
    4. For the unique identifier use `repository`. See note (1) below for more details.
    5. You **MUST** click "Require Sub Claim on role association".  This will prevent you from attaching this to a role without any additional checks. If you accidentally forgot to set subclaim checks, then any GitHub runner owned by *anyone* would be able to authenticate to AKeyless and access your resources... **that make this a critical checkbox**.  See the [GitHub docs](https://docs.GitHub.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect#configuring-the-oidc-trust-with-the-cloud) for more details.
2. Create an appropriate access role (if you don't already have one)
    1. In AKeyless go to "Access Roles" -> "+ New"
    2. Give it a name and location, and create it.
    3. Find your new access role and click on it to edit it.
    4. On the right side, under "Secrets & Keys", click the "Add" button to configure read access to any static or dynamic secrets you will fetch from your pipeline.
3. Attach your GitHub JWT Auth method to your role
    1. Once again, find the access role you created in step #2 above and click on it to edit it.
    2. Hit the "+ Associate" button to associate your "GitHub JWT Auth" method with the role.
    3. In the list, find the auth method you created in Step #1 above.
    4. Add an appropriate sub claim, based on [the claims available in the JWT](https://docs.GitHub.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect#understanding-the-oidc-token). See note (2) below for more details.
    5. Save!

After following these steps, you'll be ready to use JWT Auth from your GitHub runners!

**(1) Note:** The unique identifier is mainly used for auditing/billing purposes, so there isn't one correct answer here.  `repository` is a sensible default but if you are uncertain, talk to AKeyless for more details.

**(2) Note:** Subclaim checks allow AKeyless to grant access to specific workflows, based on the claims that GitHub provides in the JWT.  Using the example JWT from [the documentation](https://docs.GitHub.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect#understanding-the-oidc-token), you could set a subclaim check in AKeyless (using example below) to limit access to workflows that were triggered from the main branch in the `octo-org/octo-repo` repository.:

```
repository=octo-org/octo-repo
ref=refs/heads/main
```

## Example

Here are some examples you can use for guidance:
