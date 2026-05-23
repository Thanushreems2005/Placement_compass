import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  History,
  Search,
  Filter,
  ArrowUpDown,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { AptitudeAttemptResponse } from "@/types/aptitude";
import { safeNum } from "@/lib/aptitude-analytics";

interface TestHistoryTableProps {
  attempts: AptitudeAttemptResponse[];
}

export function TestHistoryTable({ attempts = [] }: TestHistoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filter attempts
  const filteredAttempts = attempts.filter((item) => {
    const matchesSearch =
      item.subtopic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.topic.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesTopic =
      selectedTopic === "all" || item.topic === selectedTopic;
      
    return matchesSearch && matchesTopic;
  });

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredAttempts.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAttempts = filteredAttempts.slice(startIndex, startIndex + itemsPerPage);

  // Extract unique topics for filter dropdown
  const uniqueTopics = Array.from(new Set(attempts.map((a) => a.topic)));

  const getDifficultyColor = (diff?: string) => {
    switch ((diff || "Medium").toLowerCase()) {
      case "easy":
        return "bg-success/5 text-success border-success/20";
      case "hard":
        return "bg-destructive/5 text-destructive border-destructive/20";
      default:
        return "bg-warning/5 text-warning border-warning/20";
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="glassmorphism border-border/40 shadow-xl overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 font-display text-lg font-bold">
              <History className="h-5 w-5 text-primary" />
              Practice History
            </CardTitle>
            <CardDescription>
              Detailed breakdown of your recent aptitude sectional attempts.
            </CardDescription>
          </div>

          {/* Filtering and Search Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subtopics..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-3 text-xs bg-background border border-input rounded-xl text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Modules</option>
              {uniqueTopics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic.replace(" Aptitude", "").replace(" Reasoning", "").replace(" Ability", "")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {paginatedAttempts.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10">
                  <TableHead className="font-display font-bold text-xs">Date</TableHead>
                  <TableHead className="font-display font-bold text-xs">Topic / Subtopic</TableHead>
                  <TableHead className="font-display font-bold text-xs text-center">Score</TableHead>
                  <TableHead className="font-display font-bold text-xs text-center">Accuracy</TableHead>
                  <TableHead className="font-display font-bold text-xs text-center">Breakdown</TableHead>
                  <TableHead className="font-display font-bold text-xs text-center">Questions/Min</TableHead>
                  <TableHead className="font-display font-bold text-xs text-center">Difficulty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAttempts.map((attempt) => (
                  <TableRow key={attempt.id} className="hover:bg-muted/5">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(attempt.created_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-semibold text-xs text-foreground">
                        {attempt.topic}
                      </div>
                      {attempt.subtopic && (
                        <div className="text-[10px] text-muted-foreground">{attempt.subtopic}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-semibold font-mono text-xs text-foreground">
                      {Math.round(safeNum(attempt.accuracy))}/100
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          (attempt.accuracy ?? 0) >= 80
                            ? "bg-success/5 text-success border-success/20"
                            : (attempt.accuracy ?? 0) >= 60
                            ? "bg-warning/5 text-warning border-warning/20"
                            : "bg-destructive/5 text-destructive border-destructive/20"
                        }`}
                      >
                        {Math.round(safeNum(attempt.accuracy))}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2.5 text-[10px] font-semibold text-muted-foreground">
                        <span className="flex items-center gap-0.5 text-success">
                          <Check className="h-3 w-3" />
                          {attempt.correct_answers ?? 0}
                        </span>
                        <span className="flex items-center gap-0.5 text-destructive">
                          <X className="h-3 w-3" />
                          {attempt.wrong_answers ?? 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-foreground">
                      {(() => {
                        const totalSec = safeNum(attempt.total_time_seconds ?? attempt.average_solving_time);
                        const qs = safeNum(attempt.total_questions);
                        if (totalSec > 0 && qs > 0) {
                          const qpm = (qs / (totalSec / 60));
                          return `${qpm.toFixed(1)} q/min`;
                        }
                        // fallback: derive from avg_speed (stored as seconds/question)
                        const avgSpeedSec = safeNum(attempt.avg_speed ?? attempt.average_solving_time);
                        if (avgSpeedSec > 0 && qs > 0) {
                          const qpm = 60 / avgSpeedSec;
                          return `${qpm.toFixed(1)} q/min`;
                        }
                        return "--";
                      })()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-[10px] uppercase font-bold ${getDifficultyColor(attempt.difficulty)}`}>
                        {attempt.difficulty ?? "Medium"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No mock records found matching filters.
          </div>
        )}

        {/* Pagination controls */}
        {filteredAttempts.length > itemsPerPage && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/20">
            <span className="text-xs text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(filteredAttempts.length, startIndex + itemsPerPage)} of {filteredAttempts.length} mock tests
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((c) => c - 1)}
                className="h-8 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-semibold text-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((c) => c + 1)}
                className="h-8 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
