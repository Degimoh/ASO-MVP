import { PageShell } from "@/components/dashboard/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  return (
    <PageShell
      title="Settings"
      description="Manage workspace-level preferences for your SaaS dashboard shell."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>Mock organization settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input id="workspace-name" defaultValue="AI ASO Studio" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-language">Default Language</Label>
              <Input id="default-language" defaultValue="English (US)" />
            </div>
            <Button variant="outline" disabled>
              Save Workspace (mock)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Integrations</CardTitle>
            <CardDescription>Mock OpenRouter and webhook settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="openrouter-key">OpenRouter API Key</Label>
              <Input id="openrouter-key" defaultValue="sk-or-********************************" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="callback-url">Callback URL</Label>
              <Input id="callback-url" placeholder="https://example.com/webhooks/aso" />
            </div>
            <Button variant="outline" disabled>
              Test Connection (mock)
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
