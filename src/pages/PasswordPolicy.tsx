import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, Check, X, KeyRound } from "lucide-react";

const rules = [
  "At least 8 characters long (12 or more is strongly recommended).",
  "At least one uppercase letter (A-Z) and one lowercase letter (a-z).",
  "At least one number (0-9).",
  "At least one special character, for example ! @ # $ % ^ & * ? -",
  "No more than 72 characters in total.",
  "Must not appear in any known data breach list.",
];

const avoid = [
  "Your name, email address, employee ID or birthday.",
  "Office-related words such as \"ilocossur\", \"pgis\" or \"portal\".",
  "Simple sequences like \"12345678\", \"password1\" or \"qwerty\".",
  "A password you already use for another website or account.",
  "Sharing your password with a colleague or writing it on a note.",
];

const PasswordPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted/40 py-8 px-4">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <Button variant="ghost" onClick={() => navigate("/auth")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Password Policy</CardTitle>
                <CardDescription>
                  Rules your PGIS Employee Portal password must follow.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Requirements</h2>
              <ul className="space-y-2">
                {rules.map((rule) => (
                  <li key={rule} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Please avoid</h2>
              <ul className="space-y-2">
                {avoid.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-3 rounded-lg border bg-card p-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <KeyRound className="h-4 w-4 text-primary" />
                If your password is rejected
              </h2>
              <p className="text-sm text-muted-foreground">
                The portal checks new passwords against public breach lists. If yours is found there,
                it will be refused even when it meets every rule above — simply choose a different
                one. You can change your password any time from the reset page.
              </p>
              <Button onClick={() => navigate("/reset-password")} className="mt-1">
                Change my password
              </Button>
            </section>

            <p className="text-xs text-muted-foreground">
              Keep your password private. If you believe someone else knows it, change it
              immediately and inform your department head.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PasswordPolicy;
