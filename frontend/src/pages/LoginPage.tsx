import { zodResolver } from "@hookform/resolvers/zod";
import {
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
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import brandLogo from "@/assets/images/brand/logo.png";
import loginHeroDark from "@/assets/images/illustrations/wallet-with-coins-dark.png";
import loginHeroDarkMobile from "@/assets/images/illustrations/wallet-with-coins-dark-mobile.png";
import loginHeroLight from "@/assets/images/illustrations/wallet-with-coins-light.png";
import loginHeroLightMobile from "@/assets/images/illustrations/wallet-with-coins-light-mobile.png";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { getInlineErrorMessage } from "@/lib/errors/normalize";
import { useAuthStore } from "@/stores/useAuthStore";

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or username"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type LoginRequestPayload = { password: string; email?: string; username?: string };

type LoginResponse = {
  user: Record<string, unknown>;
  data?: {
    user?: Record<string, unknown>;
  };
};

const featureItems = [
  {
    label: "Track your income and expenses",
    icon: TrendingUp,
  },
  {
    label: "Manage budgets and savings goals",
    icon: ChartPie,
  },
  {
    label: "Secure and private banking",
    icon: ShieldCheck,
  },
  {
    label: "Insights to grow your money",
    icon: ChartColumnBig,
  },
];

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
);

const AppleIcon = () => (
  <svg
    aria-hidden
    className="size-4 shrink-0"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M16.1 1.1c-1.3.1-2.5.8-3.2 1.7-.6.7-1.1 1.7-1 2.7 1.1 0 2.1-.4 2.8-1.1.7-.7 1.2-1.6 1.4-2.3zM20.1 7.1c-1.4-.1-2.4.3-3.2 1-1.3 1-2.2 1-3.4 0-1.1-1-2.1-1.2-3.5-1-1.5.2-2.8 1.1-3.4 1-1.4.1-2.6-.2-3.4-1-1-1-1.7-2.1-1.6-3.2 0-1.2.2-2.3.8-3.1H4.4c-1.2 2-1.8 3.4-1.6 4.2.1 1.3.7 2.2 1.2 2.5.1.1.2.1.2.1.1 0 1-1.2 2-1.4.6-.1 1.2-.1 1.5-.1.4 0 1.1.1 1.8.3 1.2.2 1.2.1 2.3-.1 1.1-.2 1.8-.1 2.1 0 1.2.1 1.2 0 1.2 1.1v4.4c-1.2 0-2.1.4-2.4 1.1-.1.2-.1.3-.1.4 0 .4.1.5.1.5.1.1.1.1.1.1h-4.5c-1.2 0-2.1.6-2.2 1.2-.1.1-.1.2-.1.2 0 .3.1.3.1.3.1.1.1.1.1.1.1.1.2.1.3.1h16.1c.1 0 .2-.1.3-.1.1 0 .1 0 .1-.1.1 0 .1-.1.1-.2.1 0 0 0 0 0V12c-1-1-2-1-3.4-1.1z" />
  </svg>
);

export const LoginPage = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [apiError, setApiError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const handleSubmit = async (values: LoginFormValues) => {
    setApiError("");

    try {
      const normalizedIdentifier = values.identifier.trim().toLowerCase();
      const payload: LoginRequestPayload = {
        password: values.password,
      };

      if (normalizedIdentifier.includes("@")) {
        payload.email = normalizedIdentifier;
      } else {
        payload.username = normalizedIdentifier;
      }

      const response = await api.post<LoginResponse>("/users/login", payload);
      const user = response.user ?? response.data?.user;

      if (!user) {
        setApiError("Login succeeded but user data is missing in response");
        return;
      }

      setUser(user);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setApiError(
        getInlineErrorMessage(error, "Unable to login right now. Please try again."),
      );
    }
  };

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[120rem] flex-col px-3 py-6 sm:px-4 sm:py-8 md:px-6 lg:flex-row lg:items-stretch lg:px-8 lg:py-10 xl:px-10 xl:py-14">
        {/* Desktop Hero Image */}
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

        {/* Logo and Title — ~20% on lg (2/10) */}
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

        {/* <div className="flex-1"></div> */}

        {/* Desktop Sidebar — ~50% on lg (5/10) */}
        <aside className="z-10 hidden min-h-0 flex-col items-start justify-center px-6 py-8 lg:flex lg:min-w-0 lg:basis-0 lg:flex-[4] lg:px-10 lg:py-12 lg:pr-6 xl:gap-8 xl:px-12 xl:pr-8 2xl:px-16 2xl:py-16 2xl:pr-10">
          <div className="mx-auto w-full max-w-md flex flex-col justify-center gap-6 xl:gap-8 2xl:gap-10">
            <div className="space-y-3 xl:space-y-4 2xl:space-y-5">
              <h1 className="text-2xl font-bold tracking-tight text-primary lg:text-3xl xl:text-4xl 2xl:text-5xl">
                Welcome back!
              </h1>
              <p className="max-w-md text-sm text-muted-foreground lg:text-base xl:text-lg 2xl:text-xl">
                Sign in to continue managing your finances with ease.
              </p>
            </div>

            <ul className="max-w-md">
              {featureItems.map((item) => {
                const Icon = item.icon;

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
                );
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
                  &ldquo;The best way to gain control of your money is to track
                  it.&rdquo;
                </p>
              </blockquote>
              <figcaption className="mt-2 text-xs text-muted-foreground 2xl:text-sm">
                — Personal finance wisdom
              </figcaption>
            </figure>
          </div>
        </aside>

        {/* Login Form — ~30% on lg (3/10) */}
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
                  Log in to your account
                </CardTitle>
                <CardDescription className="text-sm md:text-base">
                  Welcome back! Please enter your details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={form.handleSubmit(handleSubmit)}
                  noValidate
                >
                  <div className="space-y-2">
                    <Label htmlFor="identifier">Email or username</Label>
                    <div className="relative">
                      <Mail
                        className="pointer-events-none absolute top-1/2 left-2.5 z-1 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        id="identifier"
                        className="pl-9"
                        type="text"
                        placeholder="Enter your email or username"
                        autoComplete="username"
                        aria-invalid={Boolean(form.formState.errors.identifier)}
                        {...form.register("identifier")}
                      />
                    </div>
                    {form.formState.errors.identifier && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.identifier.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <Label htmlFor="password">Password</Label>
                    </div>
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute top-1/2 left-2.5 z-1 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        id="password"
                        className="pr-10 pl-9"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        aria-invalid={Boolean(form.formState.errors.password)}
                        {...form.register("password")}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1/2 right-0.5 z-1 size-8 -translate-y-1/2"
                        onClick={handleTogglePassword}
                        aria-pressed={showPassword}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
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

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                      />
                      <Label
                        htmlFor="remember-me"
                        className="text-sm font-normal text-foreground"
                      >
                        Remember me
                      </Label>
                    </div>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-sm"
                      asChild
                    >
                      <Link
                        to="/forgot-password"
                        className="text-primary no-underline hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </Button>
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
                    {form.formState.isSubmitting ? "Logging in..." : "Log in"}
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
              Don&apos;t have an account?{" "}
              <Link
                to="/register"
                className="text-primary font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
