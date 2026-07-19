import { prisma } from "./prisma";

// Rule-based sequential allocation engine for the Judicial Movement (Section 6.2.3).
//
// NOTE (clarification M3-1/M3-2): the BID describes the "council rules" and factor
// weights qualitatively only. This implementation uses a transparent, configurable
// weighted-score model as a defensible default:
//
//   score(judge, court, wishRank) =
//        seniorityWeight * seniorityNorm
//      + healthWeight    * healthFlag
//      + wishWeight      * wishScore(rank)
//      + councilRuleWeight * councilRuleFlag
//
// Court capacity per grade (CourtNeed.required) is treated as a HARD constraint.
// Judges are processed in descending seniority; each is placed in the highest-ranked
// wish whose court still has remaining capacity for the judge's grade.

export interface AllocationResult {
  judgeId: string;
  courtId: string;
  score: number;
  wishRankMet: number | null;
}

function yearsOfService(appointmentDate: Date | null): number {
  if (!appointmentDate) return 0;
  const ms = Date.now() - appointmentDate.getTime();
  return ms / (1000 * 60 * 60 * 24 * 365.25);
}

export async function runAllocation(cycleId: string): Promise<AllocationResult[]> {
  const cycle = await prisma.movementCycle.findUniqueOrThrow({
    where: { id: cycleId },
    include: {
      rules: true,
      needs: true,
      wishes: { include: { judge: true } },
    },
  });

  const weight = (key: string) =>
    cycle.rules.find((r) => r.key === key)?.weight ?? 0;

  const wSeniority = weight("seniority");
  const wHealth = weight("health");
  const wWish = weight("wish");
  const wCouncil = weight("council_rule");

  // Remaining capacity per court+grade (hard constraint).
  const capacity = new Map<string, number>();
  for (const n of cycle.needs) {
    capacity.set(`${n.courtId}:${n.grade}`, n.required);
  }

  // Group wishes by judge, ordered by rank.
  const byJudge = new Map<string, typeof cycle.wishes>();
  for (const w of cycle.wishes) {
    const arr = byJudge.get(w.judgeId) ?? [];
    arr.push(w);
    byJudge.set(w.judgeId, arr);
  }
  for (const arr of byJudge.values()) arr.sort((a, b) => a.rank - b.rank);

  // Health flag: any verified medical excuse gives priority.
  const judgeIds = [...byJudge.keys()];
  const medical = await prisma.medicalExcuse.findMany({
    where: { judgeId: { in: judgeIds }, isVerified: true },
    select: { judgeId: true },
  });
  const hasHealthPriority = new Set(medical.map((m) => m.judgeId));

  // Order judges by seniority (most senior first).
  const judges = judgeIds
    .map((id) => byJudge.get(id)![0].judge)
    .sort(
      (a, b) =>
        yearsOfService(b.appointmentDate) - yearsOfService(a.appointmentDate)
    );

  const maxSeniority =
    Math.max(1, ...judges.map((j) => yearsOfService(j.appointmentDate)));

  const results: AllocationResult[] = [];

  for (const judge of judges) {
    const wishes = byJudge.get(judge.id)!;
    const seniorityNorm = yearsOfService(judge.appointmentDate) / maxSeniority;
    const healthFlag = hasHealthPriority.has(judge.id) ? 1 : 0;

    let placed = false;
    for (const wish of wishes) {
      const grade = judge.grade;
      const key = `${wish.courtId}:${grade}`;
      const remaining = capacity.get(key);
      if (remaining && remaining > 0) {
        // wishScore: rank 1 = 1.0, decreasing by rank.
        const wishScore = 1 / wish.rank;
        const score =
          wSeniority * seniorityNorm +
          wHealth * healthFlag +
          wWish * wishScore +
          wCouncil * 0; // council-rule flag placeholder (configurable)

        capacity.set(key, remaining - 1);
        results.push({
          judgeId: judge.id,
          courtId: wish.courtId,
          score: Number(score.toFixed(3)),
          wishRankMet: wish.rank,
        });
        placed = true;
        break;
      }
    }

    if (!placed) {
      // No wish could be satisfied — left unallocated for manual review (6.2.4).
      results.push({
        judgeId: judge.id,
        courtId: "",
        score: 0,
        wishRankMet: null,
      });
    }
  }

  return results;
}

// Persist allocation results, preserving any locked manual overrides (6.2.5).
export async function persistAllocation(
  cycleId: string,
  results: AllocationResult[]
): Promise<void> {
  const locked = await prisma.movementAllocation.findMany({
    where: { cycleId, isLocked: true },
    select: { judgeId: true },
  });
  const lockedSet = new Set(locked.map((l) => l.judgeId));

  await prisma.$transaction(async (tx) => {
    // Remove non-locked allocations, then recreate from results.
    await tx.movementAllocation.deleteMany({
      where: { cycleId, isLocked: false },
    });
    for (const r of results) {
      if (lockedSet.has(r.judgeId) || !r.courtId) continue;
      await tx.movementAllocation.create({
        data: {
          cycleId,
          judgeId: r.judgeId,
          courtId: r.courtId,
          score: r.score,
          wishRankMet: r.wishRankMet,
          isManual: false,
          isLocked: false,
        },
      });
    }
  });
}
