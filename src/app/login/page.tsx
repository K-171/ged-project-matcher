"use client";

import { useState } from "react";
import { signInWithEmail, signUpWithEmail } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GraduationCap } from "lucide-react";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    try {
      const result = isSignUp
        ? await signUpWithEmail(formData)
        : await signInWithEmail(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      // redirect throws so this is expected
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <GraduationCap className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            GED Project Matcher
          </h1>
          <p className="text-muted-foreground text-sm">
            ENSAM Meknès – 4A Génie Électrique et Distribution
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isSignUp ? "Créer un compte" : "Connexion"}</CardTitle>
            <CardDescription>
              {isSignUp
                ? "Inscrivez votre binôme pour commencer."
                : "Connectez-vous pour gérer vos préférences de projet."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="binome@etu.ensam.ma"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Mot de passe
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <label
                      htmlFor="group_name"
                      className="text-sm font-medium"
                    >
                      Nom du binôme
                    </label>
                    <Input
                      id="group_name"
                      name="group_name"
                      placeholder="Binôme 1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="member_1" className="text-sm font-medium">
                      Membre 1 (Nom complet)
                    </label>
                    <Input
                      id="member_1"
                      name="member_1"
                      placeholder="Prénom Nom"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="member_2" className="text-sm font-medium">
                      Membre 2 (Nom complet)
                    </label>
                    <Input
                      id="member_2"
                      name="member_2"
                      placeholder="Prénom Nom"
                      required
                    />
                  </div>
                </>
              )}

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? "Chargement..."
                  : isSignUp
                    ? "S'inscrire"
                    : "Se connecter"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              >
                {isSignUp
                  ? "Déjà un compte ? Se connecter"
                  : "Pas de compte ? S'inscrire"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
