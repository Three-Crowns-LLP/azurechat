# What's new - 2025

A new year brings some much requested feature updates to one of our most popular AI chat repos!

- **[Managed Identity-based security](/docs/9-managed-identities.md)**. This uses Azure's underlying RBAC and removes (almost) all keys/secrets.
- `appreg_setup.ps1` and `appreg_setup.sh` helper scripts to **[create the App Registration for you](/docs/3-add-identity.md#entra-id-authentication-provider)** in Entra ID (if you have the permissions). Less copypasta means happier devs 🥰
- Added support for private endpoints and ESLZ compliant deployment

# Unleash the Power of Azure OpenAI

1. [Introduction](#introduction)
2. [Architecture (Three Crowns fork)](#architecture)
3. [Solution Overview](./docs/1-introduction.md)
4. [Run from your local machine](./docs/2-run-locally.md)
5. [Add identity provider](./docs/3-add-identity.md)
6. [Deploy to Azure](#deploy-to-azure)
7. [Deploy to Azure with GitHub Actions](./docs/4-deploy-to-azure.md)
8. [Chatting with your file](./docs/5-chat-over-file.md)
9. [Persona](./docs/6-persona.md)
10. [Environment variables](./docs/8-environment-variables.md)
11. [Managed Identity-based deployment](./docs/9-managed-identities.md)
12. [Migration considerations](./docs/migration.md)

# Introduction

_Azure Chat Solution Accelerator powered by Azure OpenAI Service_

![Intro Image](/docs/images/intro.png)

_Azure Chat Solution Accelerator powered by Azure OpenAI Service_ is a solution accelerator that allows organisations to deploy a private chat tenant in their Azure Subscription, with a familiar user experience and the added capabilities of chatting over your data and files.

Benefits are:

1. **Private:** Deployed in your Azure tenancy, allowing you to isolate it to your Azure tenant.

2. **Controlled:** Network traffic can be fully isolated to your network and other enterprise grade authentication security features are built in.

3. **Value:** Deliver added business value with your own internal data sources (plug and play) or integrate with your internal services (e.g., ServiceNow, etc).

# Architecture

This repository is the **Three Crowns LLP fork of
[`microsoft/azurechat`](https://github.com/microsoft/azurechat)**. It is
the web-app tier of the firm's **EU-Only-LLM** offering — a third AI
chatbot tier alongside ChatGPT Enterprise and Claude Enterprise,
restricted to client matters whose contractual data-protection clauses
require EU-only processing.

The Azure resources the app runs against are provisioned by a sibling
repository,
[`Three-Crowns-LLP/EU-Only-LLM-New`](https://github.com/Three-Crowns-LLP/EU-Only-LLM-New),
which is the canonical source of truth — read its
[`PROJECT_CONTEXT.md`](https://github.com/Three-Crowns-LLP/EU-Only-LLM-New/blob/main/PROJECT_CONTEXT.md)
and
[`deployment.md`](https://github.com/Three-Crowns-LLP/EU-Only-LLM-New/blob/main/deployment.md)
first.

## Shape

- **Runtime.** Next.js / Node 20 on Azure App Service Linux (P1v3),
  VNet-integrated for egress to private endpoints on the backend
  resources. Single environment: production.
- **Region.** Sweden Central only. No Global model deployments and no
  cross-region traffic.
- **Models (per-chat toggle).**
  - **GPT-5.4** — Azure AI Services (Cognitive Services) regional
    deployment.
  - **Claude Opus 4.6** — Azure AI Foundry serverless endpoint under a
    Foundry hub and project, called through an OpenAI-compatible
    adapter (`anthropic-chat.ts`).

  Either model can be hidden from the selector at runtime via the
  `FEATURE_GPT_ENABLED` / `FEATURE_CLAUDE_ENABLED` app settings,
  without re-deploying.
- **Identity.** Entra ID SSO, restricted to the `EU-Only-LLM Access`
  security group — not tenant-wide. Denied users land on `/no-access`.
- **Chat history.** Cosmos DB NoSQL, serverless, single-region, with a
  configurable TTL (default 30 days).
- **Networking.** VNet + private endpoints for AI Services, the
  Foundry hub and project, Cosmos, hub Storage and hub Key Vault.
  Public network access is disabled on every backend resource.
- **Observability.** App Insights wired via
  `APPLICATIONINSIGHTS_CONNECTION_STRING`. One `ChatCompletion` custom
  event per turn carries `model`, `chatThreadId`, prompt / completion /
  total tokens and latency.

## Request flow

```
                   ┌─────────────────────────────────────────┐
                   │  Entra ID — security-group sign-in      │
                   └────────────────┬────────────────────────┘
                                    │ OIDC
                                    ▼
                   ┌─────────────────────────────────────────┐
Browser ─────────▶ │  App Service (this repo, Node 20)       │
                   │   • Per-chat model selector              │
                   │   • Reads env vars / app settings        │
                   └────────┬─────────────────┬──────────────┘
                            │                 │
              GPT-5.4 path  │                 │  Claude Opus 4.6 path
                            ▼                 ▼
              ┌────────────────────┐ ┌────────────────────────┐
              │ AI Services        │ │ Foundry hub / project  │
              │ (Cognitive Svcs)   │ │ serverless endpoint    │
              │ Sweden Central     │ │ Sweden Central         │
              └─────────┬──────────┘ └───────────┬────────────┘
                        │                        │
                        └───────────┬────────────┘
                                    ▼
                    ┌──────────────────────────────────┐
                    │ Cosmos DB NoSQL (chat history)   │
                    │ Sweden Central, TTL-bounded      │
                    └──────────────────────────────────┘
```

All traffic between the App Service and the backend resources stays
inside the VNet via private endpoints.

## Fork changes against upstream

Functional changes against `microsoft/azurechat`:

1. **Per-chat model selector** — upstream ships with OpenAI models only.
   The fork adds a toggle so users pick GPT-5.4 *or* Claude Opus 4.6 per
   conversation and routes to the matching Foundry endpoint. Disabled
   models are rejected by the backend with a 400.
2. **Entra security-group gate** — sign-in is restricted to one
   security group, not the whole tenant; non-members land on a
   dedicated `/no-access` page.
3. **Upstream extensions feature disabled** — the dynamic-extension
   loader (which `JSON.parse`d an admin-authored payload and registered
   it as an OpenAI tool) is short-circuited to return an empty tool
   list; extension server actions return `UNAUTHORIZED`; the nav entry
   is removed. Out of scope for this tier; reintroduction would require
   an admin-role allowlist and a signed-payload model.
4. **App Insights telemetry** — one custom `ChatCompletion` event per
   turn plus per-model latency / token metrics, on top of the codeless
   auto-collection that ships with Azure App Service.
5. **OIDC deploy** — `open-ai-app.yml` uses federated identity rather
   than a long-lived service-principal secret, matching the sibling
   infra workflow.
6. **Three Crowns branding and copy.**

Detailed change spec lives in
[`app/FORK_CHANGES.md`](https://github.com/Three-Crowns-LLP/EU-Only-LLM-New/blob/main/app/FORK_CHANGES.md)
of the sibling repo, with copy-paste-ready code in `app/snippets/`.

## Configuration

The app reads its endpoints, keys and Entra client details from App
Service application settings emitted by the sibling repo's Bicep. Key
env-var groups consumed at runtime:

- `AZURE_OPENAI_API_*` — GPT-5.4 endpoint and access.
- `AZURE_ANTHROPIC_API_ENDPOINT` / `_KEY` /
  `_DEPLOYMENT_NAME` — Claude Opus 4.6 serverless endpoint.
- `AZURE_COSMOSDB_*` — chat-history store.
- `AZURE_AD_*`, `AZURE_AD_ALLOWED_GROUP_ID`, `NEXTAUTH_*` — Entra SSO
  and the security-group gate.
- `FEATURE_GPT_ENABLED`, `FEATURE_CLAUDE_ENABLED` — per-model UI gates.
- `APPLICATIONINSIGHTS_CONNECTION_STRING` — observability.

See [`docs/8-environment-variables.md`](./docs/8-environment-variables.md)
for the full upstream list.

# Deploy to Azure

You can provision Azure resources for the solution accelerator using either the Azure Developer CLI or the Deploy to Azure button below. Regardless of the method you chose you will still need set up an [identity provider and specify an admin user](/docs/3-add-identity.md).

We recommend you also read the dedicated [Deploy to Azure](./docs/4-deploy-to-azure.md) documentation to understand how to deploy the application using GitHub Actions.

## Deployment Options

You can deploy the application using one of the following options:

- [1. Azure Developer CLI](#azure-developer-cli)
- [2. Azure Portal Deployment](#azure-portal-deployment)

### 1. Azure Developer CLI

> [!IMPORTANT]
> This section will create Azure resources and deploy the solution from your local environment using the Azure Developer CLI. Note that you do not need to clone this repo to complete these steps.

1. Download the [Azure Developer CLI](https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/overview)
1. If you have not cloned this repo, run `azd init -t microsoft/azurechat`. If you have cloned this repo, just run 'azd init' from the repo root directory.
1. Run `azd up` to provision and deploy the application

```pwsh
azd init -t microsoft/azurechat
azd up

# if you are wanting to see logs run with debug flag
azd up --debug
```

### 2. Azure Portal Deployment

> [!WARNING]
> This button will only create Azure resources. You will still need to deploy the application by following the [deploy to Azure section](/docs/4-deploy-to-azure.md) to build and deploy the application using GitHub actions.

Click on the Deploy to Azure button to deploy the Azure resources for the application.

[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://aka.ms/anzappazurechatgpt)

> [!IMPORTANT]
> The application is protected by an identity provider, follow the steps in [Add an identity provider](/docs/3-add-identity.md) section for adding authentication to your app.

[Next: Introduction](./docs/1-introduction.md)

# Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

# Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
