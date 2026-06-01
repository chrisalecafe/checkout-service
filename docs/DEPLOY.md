# Deployment Guide

## Architecture

```
GitHub Actions CI
      │
      ├── push images ──► Artifact Registry (GCP)
      │                        │
      │              ┌─────────┴──────────┐
      │              ▼                    ▼
      │         Cloud Run              Cloud Run
      │          (api)                  (web)
      │              │
      │    reads secrets from
      │     Secret Manager
      │
      └── DB/Auth ──► Supabase (managed Postgres + Auth)
```

## Prerequisites

1. **GCP project** with the following APIs enabled:
   ```
   run.googleapis.com
   artifactregistry.googleapis.com
   secretmanager.googleapis.com
   iam.googleapis.com
   ```

2. **Supabase project** — free tier is sufficient for MVP.

3. **Terraform** ≥ 1.7 and **gcloud CLI** installed locally.

---

## First-time setup

### 1. Create the Terraform state bucket

```bash
gsutil mb -p <PROJECT_ID> -l us-central1 gs://checkout-tfstate
gsutil versioning set on gs://checkout-tfstate
```

### 2. Populate secrets in Secret Manager

Run once after `terraform apply` creates the secret shells:

```bash
PROJECT=your-gcp-project-id

# Supabase connection string (Settings → Database → Connection string → URI)
echo -n "postgresql://postgres:<password>@<host>:5432/postgres?sslmode=require" \
  | gcloud secrets versions add checkout-database-url --data-file=- --project=$PROJECT

# Must match SUPABASE_JWT_SECRET in Supabase dashboard
echo -n "your-jwt-secret" \
  | gcloud secrets versions add checkout-supabase-jwt-secret --data-file=- --project=$PROJECT

echo -n "https://<project-ref>.supabase.co" \
  | gcloud secrets versions add checkout-supabase-url --data-file=- --project=$PROJECT

echo -n "your-service-role-key" \
  | gcloud secrets versions add checkout-supabase-service-role-key --data-file=- --project=$PROJECT

# Used only when AUTH_PROVIDER=jwt (self-managed). Set to any 32+ char random string.
echo -n "$(openssl rand -base64 32)" \
  | gcloud secrets versions add checkout-jwt-secret --data-file=- --project=$PROJECT
```

### 3. Configure Workload Identity Federation for GitHub Actions

```bash
PROJECT=your-gcp-project-id
REPO=your-github-org/checkout-service

gcloud iam workload-identity-pools create github \
  --project=$PROJECT \
  --location=global \
  --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc github-provider \
  --project=$PROJECT \
  --location=global \
  --workload-identity-pool=github \
  --display-name="GitHub provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

gcloud iam service-accounts create github-deploy \
  --project=$PROJECT \
  --display-name="GitHub Actions deploy SA"

# Grant the SA permissions
gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:github-deploy@$PROJECT.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:github-deploy@$PROJECT.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:github-deploy@$PROJECT.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Allow GitHub Actions to impersonate the SA
POOL_ID=$(gcloud iam workload-identity-pools describe github \
  --project=$PROJECT --location=global --format="value(name)")

gcloud iam service-accounts add-iam-policy-binding \
  github-deploy@$PROJECT.iam.gserviceaccount.com \
  --project=$PROJECT \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_ID}/attribute.repository/${REPO}"
```

### 4. Add GitHub Actions secrets

In your GitHub repo → Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `GCP_PROJECT_ID` | your GCP project ID |
| `GCP_REGION` | `us-central1` |
| `GCP_SERVICE_ACCOUNT` | `github-deploy@<PROJECT>.iam.gserviceaccount.com` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Output of `gcloud iam workload-identity-pools providers describe github-provider ...` |

### 5. Apply Terraform

```bash
cd infra/terraform/environments/production
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars

terraform init
terraform plan
terraform apply
```

---

## Local development

```bash
pnpm setup           # copy .env.example files
pnpm dev             # api + web via turbo (mock adapters, no DB needed)
docker compose up    # full stack with Postgres
```

## Migrations

Migrations run automatically:
- **Docker Compose** — via the `migrate` service before the api starts
- **CI/CD** — via a Cloud Run Job before the Cloud Run service is updated

To run manually against a local database:

```bash
cd apps/api
DATABASE_URL=postgres://dev:dev@localhost:5432/checkout pnpm exec prisma migrate deploy
```

---

## Environment variable reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ (jwt provider) | HS256 signing secret, min 32 chars |
| `AUTH_PROVIDER` | ✅ | `supabase` \| `jwt` \| `mock` |
| `DB_PROVIDER` | ✅ | `postgres` \| `mock` |
| `SUPABASE_URL` | ✅ (supabase) | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ (supabase) | Admin key from Supabase dashboard |
| `SUPABASE_JWT_SECRET` | ✅ (supabase) | JWT secret from Supabase dashboard |
| `SHELL_ORIGIN` | ✅ (production) | CORS allowed origin (web app URL) |
| `PORT` | — | API port, default `4000` |
| `DB_SSL` | — | `true` in production, `false` locally |
| `NODE_ENV` | — | `production` enables security guards |
