# Where to Paste Your OpenRouter API Key

## Quick Answer

**Paste your OpenRouter API key in one of these locations:**

1. **`.env` file in `backend/` directory** (Recommended for local development)
2. **`docker-compose.yml`** (For Docker deployments)
3. **System environment variables** (For production servers)

## Detailed Instructions

### Option 1: `.env` File (Recommended for Local Development)

1. **Navigate to the backend directory:**
   ```bash
   cd /Users/kogulan/Desktop/gesalps/backend
   ```

2. **Create or edit the `.env` file:**
   ```bash
   # If file doesn't exist, create it
   touch .env
   
   # Or edit existing file
   nano .env
   # or
   code .env
   ```

3. **Add your OpenRouter API key:**
   ```bash
   OPENROUTER_API_KEY=your-actual-api-key-here
   OPENROUTER_MODEL=mistralai/mistral-small-24b-instruct:free
   ```

4. **Save the file**

**Example `.env` file:**
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenRouter Configuration
OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
OPENROUTER_MODEL=mistralai/mistral-small-24b-instruct:free
```

### Option 2: Docker Compose (For Docker Deployments)

1. **Edit `backend/docker-compose.yml`:**

   Find the `environment:` section and add:
   ```yaml
   services:
     api:
       environment:
         - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
         - OPENROUTER_MODEL=mistralai/mistral-small-24b-instruct:free
   ```

2. **Or set it directly in docker-compose.yml:**
   ```yaml
   services:
     api:
       environment:
         - OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
         - OPENROUTER_MODEL=mistralai/mistral-small-24b-instruct:free
   ```

### Option 3: System Environment Variables (For Production)

**Linux/Mac:**
```bash
export OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
export OPENROUTER_MODEL=mistralai/mistral-small-24b-instruct:free
```

**For permanent setup (add to `~/.bashrc` or `~/.zshrc`):**
```bash
echo 'export OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here' >> ~/.zshrc
echo 'export OPENROUTER_MODEL=mistralai/mistral-small-24b-instruct:free' >> ~/.zshrc
source ~/.zshrc
```

**For systemd services:**
Edit your service file:
```ini
[Service]
Environment="OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here"
Environment="OPENROUTER_MODEL=mistralai/mistral-small-24b-instruct:free"
```

## Verify It's Working

After adding the key, restart your service and check the logs:

```bash
# For Docker
docker-compose restart api

# Check logs
docker-compose logs api | grep -i openrouter
```

You should see:
```
[INFO] ClinicalModelSelector using OpenRouter with model: mistralai/mistral-small-24b-instruct:free
```

## Security Notes

⚠️ **Important:**
- Never commit `.env` files to git (they should be in `.gitignore`)
- Never share your API key publicly
- Use environment variables in production, not hardcoded values
- Rotate your API key if it's exposed

## File Locations Summary

| Location | When to Use | File Path |
|----------|-------------|-----------|
| `.env` file | Local development | `backend/.env` |
| `docker-compose.yml` | Docker deployments | `backend/docker-compose.yml` |
| System env vars | Production servers | System-wide |
| Service config | systemd services | `/etc/systemd/system/your-service.service` |

## Quick Setup Command

If you want to quickly add it to `.env`:

```bash
cd /Users/kogulan/Desktop/gesalps/backend
echo "OPENROUTER_API_KEY=your-actual-key-here" >> .env
echo "OPENROUTER_MODEL=mistralai/mistral-small-24b-instruct:free" >> .env
```

Replace `your-actual-key-here` with your actual OpenRouter API key!
