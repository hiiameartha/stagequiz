import { parseYouTubeUrl } from "./youtube";
import type { Media } from "./types";

/** 音樂／猜歌題：點播放後才開始倒數 */
export function isAudioRoundMedia(media?: Media | null): boolean {
  if (!media?.url?.trim()) return false;
  if (media.type === "audio") return true;
  return Boolean(parseYouTubeUrl(media.url));
}
