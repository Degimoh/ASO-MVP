import { PageShell } from "@/components/dashboard/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function CreateProjectPage() {
  return (
    <PageShell
      title="Create Project"
      description="Set up app context for ASO generation. This is currently a UI placeholder without backend submission."
    >
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>Mock form layout for the creation workflow.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="app-name">App Name</Label>
            <Input id="app-name" placeholder="e.g. Habit Flow" />
          </div>
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ios">iOS</SelectItem>
                <SelectItem value="android">Android</SelectItem>
                <SelectItem value="cross-platform">Cross Platform</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="summary">App Summary</Label>
            <Textarea id="summary" placeholder="Describe your app in 1-2 paragraphs" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audience">Target Audience</Label>
            <Input id="audience" placeholder="e.g. Students and working professionals" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="keywords">Important Keywords</Label>
            <Input id="keywords" placeholder="e.g. habit tracker, productivity, streaks" />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <Button disabled>Create Project (mock)</Button>
            <p className="text-xs text-slate-500">Submission will be connected in a later iteration.</p>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
