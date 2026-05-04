"use client"

import { Clock, Bell, CheckCircle2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useVerificationStore } from "@/lib/verification-store"

interface SubmittedScreenProps {
  onComplete?: () => void
  returnUrl?: string
}

export function SubmittedScreen({ onComplete, returnUrl }: SubmittedScreenProps) {
  const { documentType, submittedAt, reset } = useVerificationStore()

  const handleDone = () => {
    console.log('[SebeVerify] Done clicked', { hasOnComplete: !!onComplete, hasReturnUrl: !!returnUrl, returnUrl });
    if (onComplete) {
      onComplete();
    } else if (returnUrl) {
      console.log('[SebeVerify] Redirecting to returnUrl:', returnUrl);
      try {
        window.location.href = returnUrl;
      } catch (error) {
        console.error('[SebeVerify] Redirect failed:', error);
        // Fallback: try opening in new tab if same-tab redirect fails
        if (confirm('Redirect failed. Open in new tab instead?')) {
          window.open(returnUrl, '_blank');
        }
      }
    } else {
      console.warn('[SebeVerify] No returnUrl or onComplete handler available');
      if (window.history.length > 1) {
        console.log('[SebeVerify] Attempting history.back()');
        window.history.back();
      } else {
        console.log('[SebeVerify] No history, redirecting to root');
        window.location.href = '/';
      }
    }
  }

  const getDocumentLabel = () => {
    switch (documentType) {
      case 'passport': return 'Passport'
      case 'national_id': return 'National ID'
      case 'driver_license': return "Driver's License"
      default: return 'Document'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Just now'
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-8">
      <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-in zoom-in duration-300">
        <Clock className="h-12 w-12 text-primary" />
      </div>
      
      <h1 className="text-2xl font-bold text-foreground mb-2 text-center text-balance">
        Verification In Progress
      </h1>
      
      <p className="text-muted-foreground text-center mb-8 max-w-sm text-pretty">
        Your documents have been submitted successfully. Our team will review your information and notify you once the verification is complete.
      </p>

      <div className="w-full max-w-sm p-4 rounded-xl bg-card border border-border mb-6">
        <h3 className="text-sm font-medium text-foreground mb-3">Submission Details</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className="text-sm font-medium text-primary flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Under Review
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Document</span>
            <span className="text-sm font-medium text-foreground">{getDocumentLabel()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Submitted</span>
            <span className="text-sm font-medium text-foreground">{formatDate(submittedAt)}</span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm p-4 rounded-xl bg-muted/50 border border-border mb-8">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-foreground mb-1">What happens next?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You will receive a notification once your verification is complete. This typically takes 1-2 business days.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <Button
          onClick={handleDone}
          className="w-full h-12"
          size="lg"
        >
          Done
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground mt-6 max-w-xs">
        Powered by SebeVerify. Your data is encrypted and securely stored.
      </p>
    </div>
  )
}
