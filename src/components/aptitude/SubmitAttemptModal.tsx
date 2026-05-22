import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, RefreshCw, AlertTriangle } from "lucide-react";
import { useSubmitAttemptMutation } from "@/hooks/use-aptitude";
import { toast } from "sonner";
import type { AptitudeTopic, DifficultyLevel } from "@/types/aptitude";

interface SubmitAttemptModalProps {
  studentId: string;
}

const TOPIC_OPTIONS: AptitudeTopic[] = [
  "Quantitative Aptitude",
  "Logical Reasoning",
  "Verbal Ability",
  "Data Interpretation",
  "Puzzles",
  "Coding Aptitude",
];

export function SubmitAttemptModal({ studentId }: SubmitAttemptModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [topic, setTopic] = useState<AptitudeTopic>("Quantitative Aptitude");
  const [subtopic, setSubtopic] = useState("");
  const [questionsAttempted, setQuestionsAttempted] = useState(10);
  const [correctAnswers, setCorrectAnswers] = useState(8);
  const [wrongAnswers, setWrongAnswers] = useState(2);
  const [skippedAnswers, setSkippedAnswers] = useState(0);
  const [totalTimeTaken, setTotalTimeTaken] = useState(300); // in seconds
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>("Medium");

  const submitMutation = useSubmitAttemptMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (correctAnswers + wrongAnswers + skippedAnswers !== questionsAttempted) {
      toast.error(
        `Sum of Correct (${correctAnswers}), Wrong (${wrongAnswers}), and Skipped (${skippedAnswers}) must equal Total Attempted (${questionsAttempted}).`
      );
      return;
    }

    setIsSubmitting(true);
    
    // Calculate accuracy and score
    const accuracy = (correctAnswers / questionsAttempted) * 100;
    const score = correctAnswers * 4 - wrongAnswers * 1; // standard marking e.g. +4, -1
    const maxScore = questionsAttempted * 4;
    const avgSolvingTime = totalTimeTaken / questionsAttempted;

    try {
      await submitMutation.mutateAsync({
        student_id: studentId,
        topic,
        subtopic: subtopic || undefined,
        score: Math.max(0, score),
        max_score: maxScore,
        accuracy,
        questions_attempted: questionsAttempted,
        correct_answers: correctAnswers,
        wrong_answers: wrongAnswers,
        skipped_answers: skippedAnswers,
        average_solving_time: avgSolvingTime,
        total_time_taken: totalTimeTaken,
        difficulty_level: difficultyLevel,
      });

      toast.success("Test attempt logged successfully!");
      setOpen(false);
      
      // Reset form
      setSubtopic("");
      setQuestionsAttempted(10);
      setCorrectAnswers(8);
      setWrongAnswers(2);
      setSkippedAnswers(0);
      setTotalTimeTaken(300);
      setDifficultyLevel("Medium");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit attempt");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl font-semibold shadow-md">
          <Plus className="h-4 w-4 mr-1.5" />
          Log Test Score
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-2xl border border-border/40 bg-popover shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-lg text-foreground">
            Log Aptitude Attempt
          </DialogTitle>
          <DialogDescription>
            Enter details from your recent practice quiz to refresh your diagnostics dashboard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Topic Selector */}
          <div className="grid gap-1.5">
            <Label htmlFor="topic" className="field-label">Topic Module</Label>
            <select
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value as AptitudeTopic)}
              className="h-10 px-3 text-xs bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {TOPIC_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Subtopic */}
          <div className="grid gap-1.5">
            <Label htmlFor="subtopic" className="field-label">Subtopic (Optional)</Label>
            <Input
              id="subtopic"
              placeholder="e.g. Time & Work, Coding Decoding, Syllogisms"
              value={subtopic}
              onChange={(e) => setSubtopic(e.target.value)}
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Difficulty */}
            <div className="grid gap-1.5">
              <Label htmlFor="difficulty" className="field-label">Difficulty</Label>
              <select
                id="difficulty"
                value={difficultyLevel}
                onChange={(e) => setDifficultyLevel(e.target.value as DifficultyLevel)}
                className="h-10 px-3 text-xs bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            {/* Total Time */}
            <div className="grid gap-1.5">
              <Label htmlFor="time" className="field-label">Total Time (Seconds)</Label>
              <Input
                id="time"
                type="number"
                min={1}
                value={totalTimeTaken}
                onChange={(e) => setTotalTimeTaken(parseInt(e.target.value) || 0)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Question Breakdown grid */}
          <div className="p-4 rounded-xl border border-border/30 bg-muted/10 space-y-3">
            <span className="label-eyebrow text-foreground block">Questions Scorecard</span>
            
            <div className="grid grid-cols-4 gap-3">
              <div className="grid gap-1">
                <Label htmlFor="q_attempted" className="text-[10px] text-muted-foreground uppercase font-semibold">Total Qs</Label>
                <Input
                  id="q_attempted"
                  type="number"
                  min={1}
                  value={questionsAttempted}
                  onChange={(e) => setQuestionsAttempted(parseInt(e.target.value) || 0)}
                  className="h-9 text-xs rounded-lg text-center"
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="q_correct" className="text-[10px] text-success uppercase font-semibold">Correct</Label>
                <Input
                  id="q_correct"
                  type="number"
                  min={0}
                  value={correctAnswers}
                  onChange={(e) => setCorrectAnswers(parseInt(e.target.value) || 0)}
                  className="h-9 text-xs rounded-lg text-center border-success/20 text-success bg-success/5"
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="q_wrong" className="text-[10px] text-destructive uppercase font-semibold">Wrong</Label>
                <Input
                  id="q_wrong"
                  type="number"
                  min={0}
                  value={wrongAnswers}
                  onChange={(e) => setWrongAnswers(parseInt(e.target.value) || 0)}
                  className="h-9 text-xs rounded-lg text-center border-destructive/20 text-destructive bg-destructive/5"
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="q_skipped" className="text-[10px] text-muted-foreground uppercase font-semibold">Skipped</Label>
                <Input
                  id="q_skipped"
                  type="number"
                  min={0}
                  value={skippedAnswers}
                  onChange={(e) => setSkippedAnswers(parseInt(e.target.value) || 0)}
                  className="h-9 text-xs rounded-lg text-center"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-10 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 rounded-xl text-xs font-semibold px-5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Log Attempt"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
