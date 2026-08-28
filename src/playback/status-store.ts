import { create } from "zustand";

import { idlePlayerStatus, type PlayerStatus } from "@/playback/types";

export const usePlaybackStore = create<PlayerStatus>(() => idlePlayerStatus);
