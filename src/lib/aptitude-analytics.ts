import type { DashboardResponse, LearningRoadmapResponse, TopicAnalytics } from "@/types/aptitude";

export function safeNum(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

export function buildRuleBasedCoachInsight(d: DashboardResponse): string {
  if (safeNum(d.total_tests) === 0) {
    return "Log your first practice attempt to unlock personalized coaching recommendations.";
  }

  const topics = d.topic_breakdown ?? [];
  const practiced = topics.filter((t) => safeNum(t.total_attempts) > 0);
  // average_speed stored as q/min (higher = faster). Below 1 q/min = slow.
  const weak  = practiced.filter((t) => safeNum(t.average_accuracy) < 60);
  const slow  = practiced.filter((t) => {
    const qpm = safeNum(t.average_speed);
    return qpm > 0 && qpm < 1.0; // less than 1 question per minute is very slow
  });
  const strong = practiced.filter((t) => t.is_strong);

  const parts: string[] = [];

  if (weak.length > 0) {
    parts.push(
      `Revise ${weak[0].topic} — accuracy is below 60%. Allocate 30 minutes daily to foundational drills.`,
    );
  }
  if (slow.length > 0) {
    const qpm = safeNum(slow[0].average_speed);
    parts.push(
      `Improve speed in ${slow[0].topic} — only ${qpm.toFixed(1)} questions/min. Target at least 1.5 q/min with timed practice sets.`,
    );
  }
  if (strong.length > 0) {
    parts.push(`Maintain your streak in ${strong[0].topic} — this is a placement-ready strength.`);
  }
  if (parts.length === 0) {
    const qpmList = practiced.filter((t) => safeNum(t.average_speed) > 0);
    const avgQpm = qpmList.length > 0
      ? qpmList.reduce((s, t) => s + safeNum(t.average_speed), 0) / qpmList.length
      : 0;
    if (avgQpm >= 1.5 && safeNum(d.readiness_score) >= 75) {
      parts.push(
        `Great work! Your accuracy and speed (${avgQpm.toFixed(1)} q/min avg) are placement-ready. Keep consistent practice.`,
      );
    } else {
      parts.push(
        `Continue consistent practice. Overall readiness is ${Math.round(safeNum(d.readiness_score))}%.`,
      );
    }
  }

  return parts.join(" ");
}

export function buildRuleBasedRoadmap(
  d: DashboardResponse,
  studentId: string,
): LearningRoadmapResponse {
  const practiced = (d.topic_breakdown ?? []).filter((t) => safeNum(t.total_attempts) > 0);
  const focus =
    d.weak_areas.length > 0
      ? d.weak_areas
      : practiced.map((t) => t.topic);

  const focusTopics = focus.length > 0 ? focus : ["Quantitative Aptitude"];

  const weekly_goals = focusTopics.slice(0, 4).map((area, idx) => {
    const topic = d.topic_breakdown.find((t) => t.topic === area);
    const accuracy = safeNum(topic?.average_accuracy);
    const speed = safeNum(topic?.average_speed);
    const targetAccuracy = Math.min(100, Math.max(70, Math.round(accuracy + 15)));

    const milestones: string[] = [];
    if (accuracy < 60) {
      milestones.push(`Revise core concepts in ${area} (accuracy below 60%)`);
    }
    if (speed > 45) {
      milestones.push(`Complete timed practice sets in ${area} (target under 45s per question)`);
    }
    if (topic?.is_strong) {
      milestones.push(`Maintain practice streak in ${area} — strong topic`);
    }
    if (milestones.length === 0) {
      milestones.push(`Complete 20 practice questions in ${area}`);
      milestones.push(`Attempt 1 sectional test for ${area}`);
    }

    return {
      week: idx + 1,
      topics: [area],
      primary_topic: area,
      target_accuracy: targetAccuracy,
      hours_planned: 4.5,
      milestones,
    };
  });

  return {
    student_id: studentId,
    recommended_topics: focusTopics,
    weekly_goals,
    daily_targets: {},
    focus_areas: focusTopics,
    completion_progress: Math.min(100, safeNum(d.total_tests) * 8),
    ai_insights: buildRuleBasedCoachInsight(d),
    generated_at: new Date().toISOString(),
  };
}

export function normalizeTopicAnalytics(item: TopicAnalytics): TopicAnalytics {
  const totalAttempts = safeNum(item.total_attempts);
  return {
    ...item,
    mastery_score: safeNum(item.mastery_score),
    average_accuracy: safeNum(item.average_accuracy),
    average_speed: safeNum(item.average_speed),
    total_attempts: totalAttempts,
    improvement_trend: safeNum(item.improvement_trend),
    readiness_percentage: safeNum(item.readiness_percentage),
    is_weak: totalAttempts > 0 ? item.is_weak : false,
    is_strong: totalAttempts > 0 ? item.is_strong : false,
  };
}

/**
 * Normalizes dashboard data from the backend, bridging the v2 API's TopicSummary
 * shape (avg_accuracy, attempts) into the frontend's TopicAnalytics shape.
 */
export function normalizeDashboard(d: DashboardResponse): DashboardResponse {
  const rawBreakdown = (d.topic_breakdown ?? []) as unknown as Array<Record<string, unknown>>;

  const normalizedBreakdown: TopicAnalytics[] = rawBreakdown.map((item) => {
    // v2 API shape: { topic, avg_accuracy, avg_score, attempts, is_weak, is_strong }
    // Frontend shape: { topic, average_accuracy, total_attempts, mastery_score, ... }
    const avgAcc = safeNum(item["average_accuracy"] ?? item["avg_accuracy"]);
    const totalAttempts = safeNum(item["total_attempts"] ?? item["attempts"]);
    const masteryScore = safeNum(item["mastery_score"] ?? item["avg_score"] ?? avgAcc);
    const readinessPct = safeNum(item["readiness_percentage"] ?? Math.min(100, avgAcc * 0.9));

    // Compute q/min: prefer total_time_seconds + total_questions; fallback to stored avg_speed
    let qpm = 0;
    const totalSec = safeNum(item["total_time_seconds"] ?? item["average_solving_time"]);
    const totalQs  = safeNum(item["total_questions"] ?? totalAttempts);
    const rawAvgSpeed = safeNum(item["average_speed"] ?? item["avg_speed"]);
    if (totalSec > 0 && totalQs > 0) {
      qpm = totalQs / (totalSec / 60);
    } else if (rawAvgSpeed > 0) {
      // If stored value looks like seconds/question (>5), convert to q/min
      // If it's already small (<=5) treat as q/min directly
      qpm = rawAvgSpeed > 5 ? 60 / rawAvgSpeed : rawAvgSpeed;
    }

    return {
      topic: String(item["topic"] ?? ""),
      average_accuracy: avgAcc,
      total_attempts: totalAttempts,
      mastery_score: masteryScore,
      average_speed: Math.round(qpm * 10) / 10, // stored as q/min rounded to 1dp
      improvement_trend: safeNum(item["improvement_trend"]),
      readiness_percentage: readinessPct,
      is_weak: totalAttempts > 0 ? Boolean(item["is_weak"]) : false,
      is_strong: totalAttempts > 0 ? Boolean(item["is_strong"]) : false,
    };
  });

  return {
    ...d,
    readiness_score: safeNum(d.readiness_score),
    xp: safeNum(d.xp),
    streak: safeNum(d.streak),
    total_tests: safeNum(d.total_tests),
    weak_areas: d.weak_areas ?? [],
    strong_areas: d.strong_areas ?? [],
    topic_breakdown: normalizedBreakdown,
    recent_attempts: d.recent_attempts ?? [],
    ai_insight: d.ai_insight || buildRuleBasedCoachInsight({ ...d, topic_breakdown: normalizedBreakdown }),
    improvement_trend: d.improvement_trend ?? [],
  };
}
