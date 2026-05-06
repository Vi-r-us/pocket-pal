import { zodResolver } from "@hookform/resolvers/zod"
import {
  Check,
  ChartColumnBig,
  ChartPie,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Quote,
  ShieldCheck,
  TrendingUp,
  User,
} from "lucide-react"
import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
// import { toast } from "sonner"
import { z } from "zod"
import brandLogo from "@/assets/images/brand/logo.png"
import loginHeroDark from "@/assets/images/illustrations/wallet-with-coins-dark.png"
import loginHeroDarkMobile from "@/assets/images/illustrations/wallet-with-coins-dark-mobile.png"
import loginHeroLight from "@/assets/images/illustrations/wallet-with-coins-light.png"
import loginHeroLightMobile from "@/assets/images/illustrations/wallet-with-coins-light-mobile.png"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ApiError, api } from "@/lib/api"
import { useAuthStore } from "@/stores/useAuthStore"

const registerSchema = z
  .object({
    fullname: z.string().trim().min(2, "Full name must be at least 2 characters"),
    email: z.email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/\d/, "Password must include at least one number")
      .regex(/[A-Z]/, "Password must include at least one uppercase letter")
      .regex(/^\S+$/, "Password cannot contain spaces"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })

type RegisterFormValues = z.infer<typeof registerSchema>
type RegisterRequestPayload = { fullname: string; email: string; password: string }
type LoginRequestPayload = { password: string; email: string }

type LoginResponse = {
  user: Record<string, unknown>
  data?: {
    user?: Record<string, unknown>
  }
}

const registerFeatureItems = [
  {
    label: "Secure and private tracking",
    icon: ShieldCheck,
  },
  {
    label: "Smart money management",
    icon: TrendingUp,
  },
  {
    label: "Track and reach your goals",
    icon: ChartPie,
  },
  {
    label: "Insights for every account",
    icon: ChartColumnBig,
  },
]

const getApiErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    if (typeof error.data === "string" && error.data.trim()) {
      return error.data
    }

    if (error.data && typeof error.data === "object") {
      const message = (error.data as { message?: unknown }).message
      if (typeof message === "string" && message.trim()) {
        return message
      }
    }

    return error.message
  }

  return "Unable to sign up right now. Please try again."
}

const GoogleIcon = () => (
  <svg aria-hidden className="size-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M12 12v2.4h6.4c-.3 1.5-1.1 2.7-2.3 3.4v2.8h3.6c2.1-1.9 3.3-4.6 3.3-7.6 0-1.1-.1-2.1-.3-3H12z"
    />
    <path
      fill="currentColor"
      d="M5.1 15.1A7.1 7.1 0 0 0 6 20l-3.3 2.4A12 12 0 0 0 6 4.1v2.4a7.1 7.1 0 0 0-2.9 8.6z"
      opacity="0.9"
    />
    <path
      fill="currentColor"
      d="M12 4.8c1.2 0 2.3.3 3.1 1l2.4-2.3A8.1 8.1 0 0 0 6.1 4.1l2.2 1.4c.8-.4 1.6-.7 2.7-.7z"
    />
  </svg>
)

const AppleIcon = () => (
  <svg
    aria-hidden
    className="size-4 shrink-0"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M16.1 1.1c-1.3.1-2.5.8-3.2 1.7-.6.7-1.1 1.7-1 2.7 1.1 0 2.1-.4 2.8-1.1.7-.7 1.2-1.6 1.4-2.3zM20.1 7.1c-1.4-.1-2.4.3-3.2 1-1.3 1-2.2 1-3.4 0-1.1-1-2.1-1.2-3.5-1-1.5.2-2.8 1.1-3.4 1-1.4.1-2.6-.2-3.4-1-1-1-1.7-2.1-1.6-3.2 0-1.2.2-2.3.8-3.1H4.4c-1.2 2-1.8 3.4-1.6 4.2.1 1.3.7 2.2 1.2 2.5.1.1.2.1.2.1.1 0 1-1.2 2-1.4.6-.1 1.2-.1 1.5-.1.4 0 1.1.1 1.8.3 1.2.2 1.2.1 2.3-.1 1.1-.2 1.8-.1 2.1 0 1.2.1 1.2 0 1.2 1.1v4.4c-1.2 0-2.1.4-2.4 1.1-.1.2-.1.3-.1.4 0 .4.1.5.1.5.1.1.1.1.1.1h-4.5c-1.2 0-2.1.6-2.2 1.2-.1.1-.1.2-.1.2 0 .3.1.3.1.3.1.1.1.1.1.1.1.1.2.1.3.1h16.1c.1 0 .2-.1.3-.1.1 0 .1 0 .1-.1.1 0 .1-.1.1-.2.1 0 0 0 0 0V12c-1-1-2-1-3.4-1.1z" />
  </svg>
)

export const RegisterPage = () => {
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const [apiError, setApiError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullname: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })
  const passwordValue = useWatch({ control: form.control, name: "password" }) ?? ""
  const passwordRules = [
    { label: "At least 8 characters", passed: passwordValue.length >= 8 },
    { label: "Include a number", passed: /\d/.test(passwordValue) },
    { label: "No spaces", passed: /^\S*$/.test(passwordValue) },
    { label: "Include a uppercase letter", passed: /[A-Z]/.test(passwordValue) },
  ]

  const handleSubmit = async (values: RegisterFormValues) => {
    setApiError("")

    try {
      const registerPayload: RegisterRequestPayload = {
        fullname: values.fullname,
        email: values.email.trim().toLowerCase(),
        password: values.password,
      }

      await api.post("/users/register", registerPayload)

      const loginPayload: LoginRequestPayload = {
        email: registerPayload.email,
        password: values.password,
      }
      const loginResponse = await api.post<LoginResponse>("/users/login", loginPayload)
      const user = loginResponse.user ?? loginResponse.data?.user

      if (!user) {
        setApiError("Account created, but auto-login failed. Please login manually.")
        return
      }

      setUser(user)
      // toast.success("Account created successfully")
      navigate("/dashboard", { replace: true })
    } catch (error) {
      setApiError(getApiErrorMessage(error))
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[120rem] flex-col px-3 py-6 sm:px-4 sm:py-8 md:px-6 lg:flex-row lg:items-stretch lg:px-8 lg:py-10 xl:px-10 xl:py-14">
        <div
          className="pointer-events-none absolute top-1/2 left-[-15px] z-0 hidden w-full max-w-md -translate-y-1/2 md:block"
          aria-hidden
        >
          <img
            src={loginHeroLight}
            alt=""
            className="h-auto w-full object-contain dark:hidden"
          />
          <img
            src={loginHeroDark}
            alt=""
            className="hidden h-auto w-full object-contain dark:block"
          />
        </div>

        <div className="relative z-10 flex max-lg:shrink-0 flex-col items-center justify-center gap-3 pl-0 lg:min-w-0 lg:basis-0 lg:flex-[2] lg:items-start lg:justify-start lg:pl-8 xl:pl-10">
          <div className="flex flex-row items-center justify-center gap-3 lg:items-start lg:justify-start lg:gap-4">
            <img
              src={brandLogo}
              alt="PocketPal logo"
              className="h-10 w-10 shrink-0 object-contain md:h-11 md:w-11"
            />
            <span className="text-xl font-semibold text-foreground md:text-2xl">
              PocketPal
            </span>
          </div>
        </div>

        <aside className="z-10 hidden min-h-0 flex-col items-start justify-center px-6 py-8 lg:flex lg:min-w-0 lg:basis-0 lg:flex-[4] lg:px-10 lg:py-12 lg:pr-6 xl:gap-8 xl:px-12 xl:pr-8 2xl:px-16 2xl:py-16 2xl:pr-10">
          <div className="mx-auto w-full max-w-md flex flex-col justify-center gap-6 xl:gap-8 2xl:gap-10">
            <div className="space-y-3 xl:space-y-4 2xl:space-y-5">
              <h1 className="text-2xl font-bold tracking-tight text-primary lg:text-3xl xl:text-4xl 2xl:text-5xl">
                Create your account
              </h1>
              <p className="max-w-md text-sm text-muted-foreground lg:text-base xl:text-lg 2xl:text-xl">
                Join PocketPal today and take control of your financial future.
              </p>
            </div>

            <ul className="max-w-md">
              {registerFeatureItems.map((item) => {
                const Icon = item.icon

                return (
                  <li
                    key={item.label}
                    className="flex items-center gap-3 border-b border-border/70 py-3 text-foreground last:border-b-0"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card/50 text-primary glass shadow-glass backdrop-blur-glass backdrop-saturate-150 2xl:h-12 2xl:w-12">
                      <Icon
                        className="size-5 2xl:size-6"
                        strokeWidth={2.25}
                        aria-hidden
                      />
                    </span>
                    <span className="text-sm leading-relaxed sm:text-base 2xl:text-lg">
                      {item.label}
                    </span>
                  </li>
                )
              })}
            </ul>

            <figure className="max-w-md rounded-2xl border border-border/80 bg-card/50 px-6 py-4 text-sm text-muted-foreground glass-strong shadow-glass ring-0 backdrop-blur-glass backdrop-saturate-150 2xl:max-w-xl 2xl:px-8 2xl:py-6 2xl:text-base">
              <Quote
                className="mb-3 h-7 w-7 text-primary/70 rotate-180 2xl:h-8 2xl:w-8"
                strokeWidth={1.75}
                aria-hidden
              />
              <blockquote>
                <p className="font-medium text-foreground">
                  &ldquo;A great financial plan starts with a great daily habit.&rdquo;
                </p>
              </blockquote>
              <figcaption className="mt-2 text-xs text-muted-foreground 2xl:text-sm">
                — PocketPal community
              </figcaption>
            </figure>
          </div>
        </aside>

        <div className="relative z-10 flex w-full min-w-0 flex-1 items-center justify-center p-3 pb-8 pt-2 sm:p-4 sm:pb-10 md:pt-6 lg:basis-0 lg:flex-[4] lg:p-6 lg:pl-4 xl:p-8">
          <div className="w-full max-w-md space-y-5 md:space-y-6 lg:max-w-lg">
            <div className="flex justify-center px-4 pt-8 md:hidden">
              <img
                src={loginHeroLightMobile}
                alt=""
                className="h-auto w-full max-w-xs object-contain dark:hidden"
              />
              <img
                src={loginHeroDarkMobile}
                alt=""
                className="hidden h-auto w-full max-w-xs object-contain dark:block"
              />
            </div>

            <Card className="app-surface ring-0 p-3 py-6 sm:p-4 sm:py-7 md:p-5 md:py-8 bg-card/50 glass shadow-glass backdrop-blur-glass backdrop-saturate-150">
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">
                  Create your account
                </CardTitle>
                <CardDescription className="text-sm md:text-base">
                  It&apos;s quick and easy.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={form.handleSubmit(handleSubmit)}
                  noValidate
                >
                  <div className="space-y-2">
                    <Label htmlFor="fullname">Full name</Label>
                    <div className="relative">
                      <User
                        className="pointer-events-none absolute top-1/2 left-2.5 z-1 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        id="fullname"
                        className="pl-9"
                        type="text"
                        placeholder="Enter your full name"
                        autoComplete="name"
                        aria-invalid={Boolean(form.formState.errors.fullname)}
                        {...form.register("fullname")}
                      />
                    </div>
                    {form.formState.errors.fullname && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.fullname.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <div className="relative">
                      <Mail
                        className="pointer-events-none absolute top-1/2 left-2.5 z-1 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        id="email"
                        className="pl-9"
                        type="email"
                        placeholder="Enter your email"
                        autoComplete="email"
                        aria-invalid={Boolean(form.formState.errors.email)}
                        {...form.register("email")}
                      />
                    </div>
                    {form.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute top-1/2 left-2.5 z-1 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        id="password"
                        className="pr-10 pl-9"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        autoComplete="new-password"
                        aria-invalid={Boolean(form.formState.errors.password)}
                        {...form.register("password")}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1/2 right-0.5 z-1 size-8 -translate-y-1/2"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-pressed={showPassword}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </Button>
                    </div>
                    {form.formState.errors.password && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute top-1/2 left-2.5 z-1 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        id="confirmPassword"
                        className="pr-10 pl-9"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        autoComplete="new-password"
                        aria-invalid={Boolean(form.formState.errors.confirmPassword)}
                        {...form.register("confirmPassword")}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1/2 right-0.5 z-1 size-8 -translate-y-1/2"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-pressed={showConfirmPassword}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </Button>
                    </div>
                    {form.formState.errors.confirmPassword && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.confirmPassword.message}
                      </p>
                    )}
                    <ul className="grid grid-cols-1 gap-1 pt-1 text-xs sm:grid-cols-2">
                      {passwordRules.map((rule) => (
                        <li
                          key={rule.label}
                          className={`flex items-center gap-1.5 ${
                            rule.passed ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                          }`}
                        >
                          <Check className="size-3.5 shrink-0" aria-hidden />
                          <span>{rule.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting && (
                      <Loader2
                        className="h-4 w-4 shrink-0 animate-spin"
                        aria-hidden="true"
                      />
                    )}
                    {form.formState.isSubmitting ? "Creating account..." : "Sign up"}
                  </Button>

                  {apiError && (
                    <p className="text-sm text-destructive">{apiError}</p>
                  )}

                  <div className="flex items-center gap-3">
                    <Separator className="flex-1" />
                    <span className="shrink-0 text-xs text-muted-foreground">
                      or continue with
                    </span>
                    <Separator className="flex-1" />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled
                    >
                      <GoogleIcon />
                      Continue with Google
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled
                    >
                      <AppleIcon />
                      Continue with Apple
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-primary font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
