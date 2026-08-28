# `react-native-nitro-player` patch

We ship `react-native-nitro-player` **1.7.0-alpha.2** with a local `patch-package` overlay:

`patches/react-native-nitro-player+1.7.0-alpha.2.patch`

The stock library is a general playlist player (gapless window, skip-on-error, lock-screen prev/next). This app is **one album at a time**, **stop at the last track**, **±10 and prev/next both matter**, and **errors should wait for play()** rather than racing to the next file. The patch is the native half of that. JS still owns pause-rewind, resume, sleep timer, and the Settings toggle; it must not import this package outside `src/playback/`.

After editing native files in `node_modules`, regenerate with `npm run patch:nitro-player` (strips Android CMake/build junk). `postinstall` only **applies** the patch. A new native build is required (`npx expo run:ios` / `android`).

---

## Why we patch at all

Nitrogen-generated `PlayerConfig` has no extra fields. Flags we need (skip-on-error, remote primary, Android notification icon) travel in `androidNotificationIcon` as a small token. Upstream adding real config keys would let us drop that side channel.

---

## What the patch adds

### Album queue, not a radio stream

- Playback **stops at the end of the album** (`repeat: off`). Ending a track must not leave the player “ready to play,” or a later seek (including pause-rewind) would restart the last seconds.
- Android can **load a playlist at a given track** without treating that track as window index 0, so previous-track still works after resume.

### ±10 across track boundaries

In-app and remote ±10 are **one hop**: leftover time lands on the neighbour. First-track −10 stays at 0; last-track +10 stays at the end. Stock seek clamped inside the current file.

### Lock screen, notification, Bluetooth (“remote primary”)

Settings chooses which pair is **primary** (default **±10**). Compact notification, lock screen, Bluetooth, and car follow that pair. The other pair is **secondary**: in-app always, and on Android the **expanded notification overflow**.

- **Android** can split compact vs overflow. When primary is ±10, overflow prev/next are custom session actions so a headset can still seek without also remapping expanded skip. Media3 hides “next” on the last item — the patch keeps +10 available there when primary is seek.
- **iOS** cannot split Control Center from Bluetooth: remapping next/prev for a headset also remaps Control Center. Track skip stays in-app when primary is ±10. When primary is seek, the numbered ±10 buttons are hidden so they do not duplicate remapped next/prev.

Headset prev/next go through the **logical album queue**, not ExoPlayer’s windowed timeline (which often has the playing item at index 0).

### Errors: stay put, tap play to retry

Stock behaviour skips to the next item on a source error. We default that **off**. The failed track stays current; JS shows an error; play() retries. Network restore / stall recovery must not auto-start after an error.

Android can show a failed state on the shade/lock screen (platform error code name only). iOS has no error slot there; pause + play-to-retry is the signal. `setSkipOnSourceError(true)` restores the library skip-to-next if we ever want it.

### Language change without restarting the file

`updateTracks` used to ignore the current item unless the URL was empty. Same URL, new title/artist/artwork (UI language) now updates Now Playing / the media session without rebuilding the live queue.

### Android notification small icon

The same config token can name a **drawable** (`notification_icon`). Prebuild copies `assets/notification-icon.png` into that resource. A string with no `:` is still treated as a bare icon name.

---

## What we deliberately do not patch in

Cast, equalizer, nitro-player downloads, CarPlay/Android Auto browse. Phase 5 downloads stay a separate stack. Car V1 is lock screen / notification / Bluetooth Now Playing only.
