# Email Setup for Gesalp AI Contact Form

## Swisszonic Email Configuration

The contact form sends emails via Swisszonic SMTP. Configure the following environment variables:

### Required Environment Variables

Add these to your `.env` file or Docker environment:

```env
# Swisszonic SMTP Settings
SMTP_SERVER=mail.swisszonic.ch
SMTP_PORT=587
SMTP_USERNAME=info@gesalpai.ch
SMTP_PASSWORD=your_swisszonic_password
CONTACT_EMAIL=info@gesalpai.ch
```

### Swisszonic SMTP Settings

- **SMTP Server:** `mail.swisszonic.ch`
- **Port:** `587` (TLS/STARTTLS) or `465` (SSL)
- **Authentication:** Required
- **TLS:** Enabled

### Testing the Email Setup

1. Start the backend with the environment variables set
2. Submit the contact form on your website
3. Check the backend logs for email sending debug output
4. You should receive an email at `info@gesalpai.ch`

### Troubleshooting

If emails are not being sent, check:

1. **Backend logs** - Look for SMTP connection errors
2. **Credentials** - Verify Swisszonic password is correct
3. **Firewall** - Ensure port 587 is not blocked
4. **Email password** - Use the full email address as username

### Alternative Email Providers

If you need to use a different provider, update the SMTP settings:

#### Google Workspace:
```env
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=info@gesalpai.ch
SMTP_PASSWORD=your_app_password  # Use App Password, not regular password
```

#### SendGrid:
```env
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your_sendgrid_api_key
```

#### Mailgun:
```env
SMTP_SERVER=smtp.mailgun.org
SMTP_PORT=587
SMTP_USERNAME=your_mailgun_smtp_username
SMTP_PASSWORD=your_mailgun_smtp_password
```

