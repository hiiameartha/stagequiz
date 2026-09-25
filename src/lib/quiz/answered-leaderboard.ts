import type { RoomState } from "@/lib/quiz/types";

/** 作答中預覽排名：只留已交卷玩家，避免劇透尚未作答者的名次壓力 */
export function withAnsweredLeaderboard(state: RoomState): RoomState {
  const answeredIds = new Set(
    state.players.filter((p) => p.hasAnswered).map((p) => p.id)
  );
  return {
    ...state,
    leaderboard: state.leaderboard.filter((p) => answeredIds.has(p.id)),
  };
}
