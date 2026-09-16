import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().trim().email({ message: "Enter a valid email address" }).max(255);
const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(72, { message: "Password must be less than 72 characters" });

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mode, setMode] = useState<"request" | "update">("request");
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let mounted = true;

    // A recovery link (or an already signed-in employee) means we can set a new password directly.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && mounted) {
        setMode("update");
        setCheckingSession(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) setMode("update");
      setCheckingSession(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast({ title: "Invalid email", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast({
        title: "Reset link sent",
        description: "Check your inbox for a link to set a new password.",
      });
    } catch (error: any) {
      console.error("Password reset request failed:", error);
      toast({
        title: "Could not send reset link",
        description: error?.message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      toast({ title: "Weak password", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", description: "Re-enter the same password twice.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: "Password updated",
        description: "Your new password is now active.",
      });
      setPassword("");
      setConfirmPassword("");
      navigate("/", { replace: true });
    } catch (error: any) {
      console.error("Password update failed:", error);
      const message: string = error?.message || "Please try again.";
      toast({
        title: "Could not update password",
        description: /leaked|pwned|compromis/i.test(message)
          ? "This password has appeared in a known data breach. Please choose a different one."
          : message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {mode === "update" ? "Set a new password" : "Reset your password"}
          </CardTitle>
          <CardDescription>
            {mode === "update"
              ? "Choose a password you haven't used elsewhere."
              : "We'll email you a secure link to choose a new password."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {mode === "update" ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update password"}
              </Button>
            </form>
          ) : sent ? (
            <div className="space-y-4 text-center">
              <Mail className="w-10 h-10 mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                If an account exists for <span className="font-medium text-foreground">{email}</span>, a reset link is on
                its way. The link expires shortly, so use it soon.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                Send to a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSendLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Work email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    placeholder="you@ilocossur.gov.ph"
                    autoComplete="email"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send reset link"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="inline-flex items-center text-sm text-primary hover:underline"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to sign in
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
