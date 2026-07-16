import { TEAMS } from './teams';

// calculateOccupancy 결과에 팀 이름/공격 점유율 매핑을 덧붙인다.
export function buildOccupancyView(result) {
  if (result.status === 'insufficient_data') {
    return result;
  }

  const teams = Object.fromEntries(
    Object.values(TEAMS).map((team) => {
      const opponentSide = team.side === 'left' ? 'right' : 'left';
      const attackDurationMs =
        opponentSide === 'left' ? result.leftDurationMs : result.rightDurationMs;
      const attackRatio =
        opponentSide === 'left' ? result.leftRatio : result.rightRatio;
      return [
        team.id,
        { name: team.fullName, shortName: team.shortName, attackRatio, attackDurationMs },
      ];
    })
  );

  return {
    status: 'ok',
    sampleCount: result.sampleCount,
    totalDurationMs: result.totalDurationMs,
    teams,
  };
}
