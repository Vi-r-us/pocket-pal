import { PagePlaceholder } from './PagePlaceholder'

export const ForgotPasswordPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <PagePlaceholder description="Request a password reset link. This will be available once the backend is ready." />
      </div>
    </div>
  )
}
