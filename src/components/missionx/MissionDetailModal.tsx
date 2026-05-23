import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Github, Trophy, Code2, ExternalLink, ArrowRight } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Mission } from "./MissionCard";

interface MissionDetailModalProps {
  mission: Mission | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept: (missionId: string) => void;
}

export function MissionDetailModal({ mission, isOpen, onClose, onAccept }: MissionDetailModalProps) {
  if (!mission) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] bg-surface/95 backdrop-blur-xl border-border/50 shadow-2xl">
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-background rounded-lg shadow-sm border border-border/40">
              <CompanyLogo name={mission.company} size="sm" />
            </div>
            <div>
              <DialogTitle className="text-xl">{mission.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Github className="w-4 h-4" />
                {mission.repo}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-secondary/50 flex flex-col items-center justify-center gap-1 text-center">
              <Trophy className="w-5 h-5 text-amber-500 mb-1" />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Reward</span>
              <span className="font-semibold">{mission.difficulty === 'Easy' ? 100 : mission.difficulty === 'Medium' ? 250 : 500} XP</span>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 flex flex-col items-center justify-center gap-1 text-center">
              <Clock className="w-5 h-5 text-primary mb-1" />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Est. Time</span>
              <span className="font-semibold">{mission.estimated_time || "2-4 hours"}</span>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 flex flex-col items-center justify-center gap-1 text-center">
              <Code2 className="w-5 h-5 text-emerald-500 mb-1" />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Difficulty</span>
              <span className="font-semibold">{mission.difficulty || "Medium"}</span>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary" />
              Required Skills
            </h4>
            <div className="flex flex-wrap gap-2">
              {mission.skills?.map((skill, i) => (
                <Badge key={i} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Github className="w-4 h-4 text-primary" />
              Issue Labels
            </h4>
            <div className="flex flex-wrap gap-2">
              {mission.labels?.map((label, i) => (
                <Badge key={i} variant="outline" className="text-xs border-border/60 text-muted-foreground">
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-border/50">
          <Button 
            variant="outline" 
            className="flex-1 border-primary/20 hover:bg-primary/5 group"
            onClick={() => window.open(mission.github_url, '_blank')}
          >
            View on GitHub
            <ExternalLink className="w-4 h-4 ml-2 opacity-50 group-hover:opacity-100 transition-opacity" />
          </Button>
          <Button 
            className="flex-1 shadow-lg shadow-primary/20 group"
            onClick={() => onAccept(mission.id)}
          >
            Accept Mission
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
