import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Github, Trophy, ExternalLink, Code2 } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";

export interface Mission {
  id: string;
  title: string;
  repo: string;
  difficulty: "Easy" | "Medium" | "Advanced" | "Beginner";
  labels: string[];
  skills: string[];
  estimated_time: string;
  github_url: string;
  company: string;
}

interface MissionCardProps {
  mission: Mission;
  onAccept?: (missionId: string) => void;
  onViewDetails?: (mission: Mission) => void;
}

export function MissionCard({ mission, onAccept, onViewDetails }: MissionCardProps) {
  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case "easy":
      case "beginner":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "advanced":
      case "hard":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const getRewardPoints = (diff: string) => {
    switch (diff.toLowerCase()) {
      case "easy":
      case "beginner":
        return 100;
      case "medium":
        return 250;
      case "advanced":
      case "hard":
        return 500;
      default:
        return 50;
    }
  };

  return (
    <Card className="group relative overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 bg-surface/50 backdrop-blur-sm border-border/50">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <CardHeader className="pb-3 gap-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-background rounded-lg shadow-sm border border-border/40">
              <CompanyLogo name={mission.company} size="sm" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5" />
                {mission.repo}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={getDifficultyColor(mission.difficulty || "medium")}>
            {mission.difficulty || "Medium"}
          </Badge>
        </div>
        
        <h3 className="font-semibold text-lg leading-tight line-clamp-2 mt-1">
          {mission.title}
        </h3>
      </CardHeader>
      
      <CardContent className="pb-4 flex-1 space-y-4">
        {mission.skills && mission.skills.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Code2 className="w-3.5 h-3.5" />
              Required Skills
            </div>
            <div className="flex flex-wrap gap-1.5">
              {mission.skills.slice(0, 3).map((skill, i) => (
                <Badge key={i} variant="secondary" className="bg-secondary/50 hover:bg-secondary text-xs font-normal">
                  {skill}
                </Badge>
              ))}
              {mission.skills.length > 3 && (
                <Badge variant="secondary" className="bg-secondary/30 text-xs font-normal">
                  +{mission.skills.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" />
              <span>{mission.estimated_time || "2-4 hours"}</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-amber-500">
              <Trophy className="w-4 h-4" />
              <span>{getRewardPoints(mission.difficulty || "medium")} XP</span>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 pb-4 px-6 gap-3">
        <Button 
          variant="outline" 
          className="flex-1 border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors"
          onClick={() => onViewDetails?.(mission)}
        >
          View Details
        </Button>
        <Button 
          className="flex-1 shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-all"
          onClick={() => onAccept?.(mission.id)}
        >
          Accept Mission
        </Button>
      </CardFooter>
    </Card>
  );
}
