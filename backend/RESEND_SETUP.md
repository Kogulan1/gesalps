# Email Setup with Resend API

## Quick Start

Resend is a modern email API that doesn't require SMTP port configurations. It's simple, reliable, and has a generous free tier.

## Setup Steps

### 1. Create a Resend Account
- Go to: https://resend.com
- Sign up for a free account
- Free tier: 100 emails/day, 3,000 emails/month

### 2. Get Your API Key
- Go to: https://resend.com/api-keys
- Click "Create API Key"
- Name it (e.g., "Gesalp AI Contact Form")
- Copy the API key (starts with `re_...`)

### 3. Verify Your Domain (Optional but Recommended)
- Go to: https://resend.com/domains
- Add your domain: `gesalpai.ch`
- Add the provided DNS records to your Swisszonic DNS settings:
  - `_resend._domainkey` - TXT record for DKIM
  - `resend._domainkey` - TXT record for DKIM
- Wait for verification (usually 5-10 minutes)

### 4. Configure Environment Variables

Add to your `.env` file:

```env
# Resend API (Recommended - No port issues)
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=Gesalp AI <noreply@gesalpai.ch>
CONTACT_EMAIL=info@gesalpai.ch
```

### 5. Restart Backend

```bash
cd backend
docker-compose down
docker-compose up -d --build api
```

## Why Resend?

✅ **No SMTP port issues** - Uses HTTPS API  
✅ **No firewall conflicts** - Works from any environment  
✅ **Free tier** - 100 emails/day  
✅ **Fast setup** - 5 minutes to get started  
✅ **Reliable delivery** - 99.9% deliverability  
✅ **Simple API** - No SMTP configuration  

## Testing

After setup, test the contact form at:
- Local: http://localhost:3000/en/contact
- Production: https://yourdomain.com/en/contact

## Fallback to SMTP

If you don't add `RESEND_API_KEY`, the system will fallback to SMTP (Swisszonic). The SMTP configuration is already in place.

## Cost

- **Free**: 100 emails/day, 3,000/month
- **Essentials**: $20/month for 50,000 emails
- See: https://resend.com/pricing

## Support

- Resend Documentation: https://resend.com/docs
- API Reference: https://resend.com/docs/api-reference
- Status Page: https://status.resend.com

