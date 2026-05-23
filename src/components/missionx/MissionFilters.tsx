import { Input } from "@/components/ui/input";
import { Search, Filter, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MissionFiltersProps {
  onSearch: (value: string) => void;
  onFilterChange: (key: string, value: string) => void;
}

export function MissionFilters({ onSearch, onFilterChange }: MissionFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-center bg-surface/50 backdrop-blur-sm p-4 rounded-xl border border-border/50">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search missions by title, company, or skills..." 
          className="pl-9 bg-background/50 border-border/60 focus-visible:ring-primary/30"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      
      <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
        <Select onValueChange={(val) => onFilterChange("difficulty", val)}>
          <SelectTrigger className="w-[140px] bg-background/50 border-border/60">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Difficulties</SelectItem>
            <SelectItem value="easy">Easy (100 XP)</SelectItem>
            <SelectItem value="medium">Medium (250 XP)</SelectItem>
            <SelectItem value="advanced">Advanced (500 XP)</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={(val) => onFilterChange("company", val)}>
          <SelectTrigger className="w-[140px] bg-background/50 border-border/60">
            <SelectValue placeholder="Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            <SelectItem value="vercel">Vercel</SelectItem>
            <SelectItem value="meta">Meta</SelectItem>
            <SelectItem value="microsoft">Microsoft</SelectItem>
            <SelectItem value="google">Google</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" className="shrink-0 border-border/60 bg-background/50">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
