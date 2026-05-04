# SebeVerify SDK - ReturnUrl Setup Guide

## Problem: "Failed to fetch" after clicking Done

When verification completes and you click "Done", the SDK needs to know where to redirect back to. Without a proper `returnUrl`, you'll get redirect errors.

## Solution: Include returnUrl in your verification setup

### Using `@sebeverify/web-sdk` package:

```typescript
import { SebeVerify } from '@sebeverify/web-sdk';

const verification = new SebeVerify({
  apiKey: 'your-api-key',
  projectId: 'your-project-id', 
  backendUrl: 'https://your-backend.ngrok.io',
  returnUrl: `${window.location.origin}/verification-complete` // ⭐ REQUIRED
});

// This will automatically include returnUrl in the QR code
const qrCode = await verification.getQrForVerification();
```

### Using direct URL with query parameters:

```typescript
// ✅ CORRECT - includes returnUrl
const verifyUrl = `http://localhost:3003/verify?` +
  `projectId=${PROJECT_ID}` +
  `&apiKey=${API_KEY}` +
  `&backendUrl=${encodeURIComponent('https://your-backend.ngrok.io')}` +
  `&returnUrl=${encodeURIComponent('https://your-app.ngrok.io/dashboard')}`; // ⭐ REQUIRED

// Generate QR code
const qr = await QRCode.toDataURL(verifyUrl);
```

### Local development setup:

```typescript
// In your merchant app (abayhire)
const getVerificationConfig = () => {
  const isDev = process.env.NODE_ENV === 'development';
  
  const config = {
    apiKey: process.env.NEXT_PUBLIC_SEBEVERIFY_API_KEY,
    projectId: process.env.NEXT_PUBLIC_SEBEVERIFY_PROJECT_ID,
    backendUrl: process.env.NEXT_PUBLIC_SEBEVERIFY_BACKEND_URL,
    // Use the same base URL for SDK and return to avoid CORS issues with ngrok
    returnUrl: isDev 
      ? `${window.location.origin}/dashboard` // Use current domain
      : 'https://your-production-app.com/dashboard'
  };
  
  return config;
};
```

## Testing with ngrok

When testing locally with ngrok, use these commands:

```bash
# Terminal 1: Start the Python backend
ngrok http 8000 --subdomain your-backend  # Exposes localhost:8000

# Terminal 2: Start the SebeVerify-SDK Next.js app  
cd SebeVerify-SDK
pnpm dev  # Runs on localhost:3003

# Terminal 3: Start your merchant app
ngrok http 3000 --subdomain your-app  # If merchant app runs on 3000
```

Then access your merchant app through `https://your-app.ngrok.io` and the SDK through `https://subdomain-3003.ngrok.io`.

## Debugging Tips

After clicking "Done", check the browser console for:
- `[SebeVerify] Done clicked` with parameters
- `[SebeVerify] Redirecting to returnUrl:` with the actual URL
- Any network errors or CORS warnings

If you see "No returnUrl provided", you need to add it to your SDK initialization.

## Common Issues

1. **CORS errors**: Use the same ngrok subdomain for both merchant app and SDK
2. **Missing returnUrl**: Always include `returnUrl` in SDK config or URL params
3. **Invalid returnUrl**: Must be a valid HTTP/HTTPS URL (not relative paths)
4. **Blocked by browser**: Some browsers block redirects from HTTPS to HTTP. Use HTTPS URLs.

## Quick Test URL

Use this template to generate a test verification URL:

```
http://localhost:3003/verify?projectId=YOUR_PROJECT_ID&apiKey=YOUR_API_KEY&backendUrl=https://your-backend.ngrok.io&returnUrl=https://your-app.ngrok.io/dashboard
```

Replace `YOUR_PROJECT_ID`, `YOUR_API_KEY`, and ngrok URLs with your actual values.
