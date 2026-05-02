# SebeVerify Web SDK

The official client SDK for [SebeVerify](https://sebeverify.com) – the seamless, state-of-the-art Identity Verification and KYC platform.

This hyper-lightweight, zero-dependency vanilla JavaScript SDK allows merchants to easily embed the SebeVerify Identity Capture flow directly into their websites. It seamlessly manages the "Desktop-to-Mobile" QR code handoff for high-quality document scanning and facial liveness checks.

## Installation

You can install the SDK via your preferred package manager:

```bash
npm install sebeverify-sdk
# or
yarn add sebeverify-sdk
# or
pnpm add sebeverify-sdk
```

Alternatively, you can include it directly in your HTML via a CDN:
```html
<script src="https://unpkg.com/sebeverify-sdk"></script>
```

## Quick Start

Initialize the SDK with your Project ID and API Key, and trigger the flow whenever you are ready (e.g., when a user clicks "Verify Identity").

```javascript
import SebeVerify from 'sebeverify-sdk';

// 1. Initialize the SDK
const verifier = SebeVerify({
  // Your public API Key generated from the SebeVerify Dashboard
  apiKey: "svk_12345.abcdefg",
  
  // Your Project ID
  projectId: "your-project-uuid",
  
  // The backend API routing URL
  backendUrl: "https://api.yourdomain.com",
  
  // The Vercel-hosted URL of your SebeVerify UI
  webAppUrl: "https://verify.yourdomain.com",
  
  // Where to redirect the user after a successful verification
  redirectUrl: "https://yourdomain.com/dashboard",
});

// 2. Trigger the modal
document.getElementById('verify-button').addEventListener('click', async () => {
  try {
    await verifier.start();
  } catch (error) {
    console.error("Verification failed to start:", error);
  }
});
```

## How It Works

1. **Trigger:** Calling `verifier.start()` overlays a sleek modal on your website.
2. **Desktop-to-Mobile Handoff:** If the user is on a desktop, a QR code is generated. They scan it with their phone to securely transfer the session to their mobile device.
3. **Capture:** The user photographs their Government ID and completes a fast, 60fps local AI liveness challenge.
4. **Verification:** The data is securely transmitted to the SebeVerify AI engines for OCR and biometric matching.
5. **Webhook Delivery:** Once approved, SebeVerify automatically fires a secure Webhook back to your server's database to approve the user!

## TypeScript Support

This package is written in TypeScript and includes full type definitions out of the box.

## License

MIT License
