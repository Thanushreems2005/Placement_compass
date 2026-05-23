import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentLeader {
  id: string;
  name: string;
  avatar?: string;
  xp: number;
  missionsCompleted: number;
  rank: number;
  department: string;
}

export function LeaderboardTable({ leaders }: { leaders: StudentLeader[] }) {
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Medal className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-slate-300" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-700" />;
      default:
        return <span className="font-mono text-muted-foreground font-semibold">{rank}</span>;
    }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-surface/40 backdrop-blur-md overflow-hidden">
      <Table>
        <TableHeader className="bg-secondary/30">
          <TableRow className="hover:bg-transparent border-border/50">
            <TableHead className="w-16 text-center">Rank</TableHead>
            <TableHead>Student</TableHead>
            <TableHead className="hidden md:table-cell">Department</TableHead>
            <TableHead className="text-right">Missions</TableHead>
            <TableHead className="text-right">Total XP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaders.map((leader, i) => (
            <TableRow 
              key={leader.id}
              className={cn(
                "transition-colors hover:bg-secondary/40 border-border/50",
                leader.rank <= 3 && "bg-primary/5 hover:bg-primary/10"
              )}
            >
              <TableCell className="text-center">
                <div className="flex justify-center">{getRankBadge(leader.rank)}</div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className={cn(
                    "h-9 w-9 border-2",
                    leader.rank === 1 ? "border-yellow-500" :
                    leader.rank === 2 ? "border-slate-300" :
                    leader.rank === 3 ? "border-amber-700" : "border-transparent"
                  )}>
                    <AvatarImage src={leader.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {leader.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm leading-none mb-1">{leader.name}</p>
                    {leader.rank <= 3 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/20 text-primary">
                        Top Performer
                      </Badge>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                {leader.department}
              </TableCell>
              <TableCell className="text-right font-medium text-sm">
                {leader.missionsCompleted}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1.5 font-bold text-amber-500">
                  {leader.xp.toLocaleString()}
                  <Trophy className="w-4 h-4" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
