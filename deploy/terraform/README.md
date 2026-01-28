# Infra Guide: Terraform & Kubernetes Strategy

## 1. Should we use Kubernetes (K8s)?
**Short Answer: Not yet. Stick to ECS Fargate.**

| Feature | AWS ECS (Fargate) | Kubernetes (EKS) |
| :--- | :--- | :--- |
| **Complexity** | Low (Serverless Docker) | High (Requires DevOps Team) |
| **Maintenance** | Zero (AWS manages OS) | High (Upgrades, Nodes, Security) |
| **Cost** | Pay per second | Control Plane Fee ($70/mo) + Nodes |
| **Goal Alignment** | **Perfect for "SOTA Engine"** | **Distraction** |

**Strategic Advice**:
You are a small team (or solo) building a complex AI product.
*   **ECS** lets you focus on the *AI Code*. It scales to 1M+ users easily.
*   **Kubernetes** forces you to become a "Cluster Admin". You will spend weeks debugging networking instead of improving the AI logic.

**Verdict**: Achieve the "All Green" SOTA Engine on ECS first. Move to K8s only when you have a dedicated DevOps engineer or require multi-cloud support.

---

## 2. How to use these Terraform Scripts

Terraform is a tool that talks to AWS for you. You don't need to click buttons in the console.

### Prerequisites
1.  **Install Terraform** (Mac):
    ```bash
    brew tap hashicorp/tap
    brew install hashicorp/tap/terraform
    ```
2.  **Install AWS CLI**:
    ```bash
    brew install awscli
    ```
3.  **Login to AWS**:
    ```bash
    aws configure
    # Enter your Access Key ID and Secret Key
    ```

### Deployment Steps

**Step 1: Go to the directory**
```bash
cd deploy/terraform
```

**Step 2: Create your Secrets File**
Create a new file called `terraform.tfvars`:
```hcl
# deploy/terraform/terraform.tfvars
project_name = "gesalps-prod"
aws_region   = "us-east-1"

# Your Supabase Credentials
database_url = "postgres://postgres:YOUR_PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres"
supabase_url = "https://PROJECT_REF.supabase.co"
supabase_key = "YOUR_SERVICE_ROLE_KEY"
```

**Step 3: Initialize**
Downloads the AWS plugins.
```bash
terraform init
```

**Step 4: Preview (Plan)**
Shows you what AWS resources will be created. It won't charge you yet.
```bash
terraform plan
```

**Step 5: Deploy (Apply)**
Actually creates the servers, queues, and networks.
```bash
terraform apply
# Type 'yes' when asked.
```

### Updates & Cleanup
*   **Update**: Change a file (e.g., increase memory in `ecs.tf`), then run `terraform apply` again. It only changes what's needed.
*   **Destroy**: To delete everything (stop billing): `terraform destroy`.
