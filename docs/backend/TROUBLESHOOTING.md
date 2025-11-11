# Troubleshooting Docker Compose Issues

## Error: "service refers to undefined volume"

### Solution 1: Check Docker Compose Version

```bash
# Check version
docker compose version
# or
docker-compose --version
```

If you see `docker-compose` (with hyphen), you might need to use:
```bash
docker-compose build
docker-compose up -d
```

### Solution 2: Verify YAML Formatting

Make sure the `volumes:` section is at the root level (same indentation as `services:`):

```yaml
services:
  # ... services ...

volumes:
  ollama:
    driver: local
```

### Solution 3: Validate the File

```bash
# Validate docker-compose file
docker compose config

# If using docker-compose (v1)
docker-compose config
```

### Solution 4: Create Volume Manually

If the issue persists, create the volume manually:

```bash
# Create the volume
docker volume create ollama

# Then try again
docker compose build
docker compose up -d
```

### Solution 5: Check File Encoding

Make sure the file uses Unix line endings (LF, not CRLF):

```bash
# Check line endings (should show "LF" not "CRLF")
file docker-compose.yml

# Convert if needed (on Linux)
dos2unix docker-compose.yml
```

### Solution 6: Use Simplified Version (if deploy section causes issues)

If you're using an older Docker Compose version that doesn't support the `deploy` section, you can remove it temporarily. The `deploy` section is optional and only sets resource limits.

## Quick Fix Commands

```bash
# 1. Create volume manually
docker volume create ollama

# 2. Validate compose file
docker compose config

# 3. If validation passes, build
docker compose build

# 4. Start services
docker compose up -d
```

