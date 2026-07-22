"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Mail, LogIn, ExternalLink } from "lucide-react";

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [accepted, setAccepted] = useState(false);
  const [surveyInfo, setSurveyInfo] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/invite/${token}`);
        const result = await res.json();
        if (!res.ok) {
          setError(result.error || "Invalid invitation");
        } else {
          setData(result);
          if (result.alreadyHasAccess) {
            setAccepted(true);
            setSurveyInfo(result.invitation.survey);
          }
        }
      } catch {
        setError("Failed to load invitation");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function acceptInvitation() {
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch(`/api/invite/${token}`, { method: "POST" });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Failed to accept invitation");
      } else {
        setAccepted(true);
        setSurveyInfo(result);
      }
    } catch {
      setError("Network error");
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <XCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold mb-2">
              {surveyInfo?.title ? `You're in!` : "Welcome!"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {surveyInfo?.title
                ? `You've been added as a collector for "${surveyInfo.title}".`
                : "You already have access to this survey."}
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => router.push("/dashboard")} className="gap-2">
                Go to Dashboard
              </Button>
              {surveyInfo?.surveyId && (
                <Button variant="outline" onClick={() => router.push(`/collect/${surveyInfo.surveyId}`)} className="gap-2">
                  <ExternalLink className="h-4 w-4" /> Start Collecting
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const invitation = data?.invitation;
  const isLoggedIn = data?.isLoggedIn;
  const emailMatch = data?.currentUserEmail === invitation?.email;

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="py-12 space-y-6">
          <div className="text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">You're Invited!</h2>
            <p className="text-muted-foreground">
              You've been invited to collect data for a survey.
            </p>
          </div>

          {invitation && (
            <div className="border rounded-lg p-4 space-y-2">
              <p className="text-sm text-muted-foreground">Survey</p>
              <p className="font-semibold">{invitation.survey.title}</p>
              {invitation.survey.description && (
                <p className="text-sm text-muted-foreground">{invitation.survey.description}</p>
              )}
              <div className="flex items-center gap-2 pt-1">
                <Badge variant={invitation.survey.status === "active" ? "success" : "secondary"}>
                  {invitation.survey.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Invited by {invitation.inviter.name || invitation.inviter.email}
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          {!isLoggedIn ? (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                You need an account to accept this invitation. Register with <strong>{invitation?.email}</strong>.
              </p>
              <Button onClick={() => router.push(`/login?invite=${token}`)} className="w-full gap-2">
                <LogIn className="h-4 w-4" /> Log In or Register
              </Button>
            </div>
          ) : !emailMatch ? (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                This invitation is for <strong>{invitation?.email}</strong> but you're logged in as <strong>{data?.currentUserEmail}</strong>.
              </p>
              <Button variant="outline" onClick={() => { document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"; window.location.reload(); }} className="w-full">
                Log Out & Switch Account
              </Button>
            </div>
          ) : (
            <Button onClick={acceptInvitation} disabled={accepting} className="w-full gap-2">
              {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {accepting ? "Accepting..." : "Accept Invitation"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
