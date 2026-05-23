import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Github, Loader2 } from "lucide-react";
import { Mission } from "./MissionCard";

interface MissionSubmissionFormProps {
  mission: Mission | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export function MissionSubmissionForm({ mission, isOpen, onClose, onSubmit }: MissionSubmissionFormProps) {
  const [prUrl, setPrUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!mission) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ missionId: mission.id, prUrl, notes });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setPrUrl("");
        setNotes("");
        onClose();
      }, 2000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-surface/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle>Submit Mission Evidence</DialogTitle>
          <DialogDescription>
            Submit your merged PR to claim XP for: <strong>{mission.title}</strong>
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-500 mb-1">Submission Successful!</h3>
              <p className="text-sm text-muted-foreground">Your PR is being verified by the AI engine.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="pr-url" className="flex items-center gap-2">
                <Github className="w-4 h-4" />
                Pull Request URL
              </Label>
              <Input 
                id="pr-url" 
                placeholder="https://github.com/company/repo/pull/123" 
                value={prUrl}
                onChange={(e) => setPrUrl(e.target.value)}
                required
                className="bg-background/50 border-border/60"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Implementation Notes (Optional)</Label>
              <Textarea 
                id="notes" 
                placeholder="Briefly describe your approach or any challenges faced..." 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-background/50 border-border/60 min-h-[100px]"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !prUrl} className="shadow-lg shadow-primary/20">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit for Verification"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
