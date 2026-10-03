// Thin C interface to Ableton Link for the Swift clock engine.
// "ticks" are host-time ticks (mach_absolute_time on macOS), the unit the engine already uses.
#ifndef MMM_LINK_H
#define MMM_LINK_H
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif

typedef struct MMMLink MMMLink;

MMMLink *mmm_link_create(double bpm);
void mmm_link_destroy(MMMLink *l);

// ---- any thread -------------------------------------------------------------------------
void   mmm_link_enable(MMMLink *l, int on);
int    mmm_link_is_enabled(const MMMLink *l);
void   mmm_link_enable_start_stop(MMMLink *l, int on);
int    mmm_link_is_start_stop_enabled(const MMMLink *l);
int    mmm_link_num_peers(const MMMLink *l);
uint64_t mmm_link_now_ticks(const MMMLink *l);

// ---- application thread (UI): reads/changes the session through the app session state -----
double mmm_link_app_tempo(MMMLink *l);
void   mmm_link_app_set_tempo(MMMLink *l, double bpm);
int    mmm_link_app_is_playing(MMMLink *l);
// Start or stop the whole session. Starting asks for beat 0 "now"; Link moves it to the next
// matching phase of `quantum` when other peers are already playing.
void   mmm_link_app_set_playing(MMMLink *l, int playing, double quantum);

// ---- engine thread only: audio session state, realtime safe ------------------------------
// mmm_link_capture() takes a snapshot; the functions below read that snapshot.
void     mmm_link_capture(MMMLink *l);
double   mmm_link_tempo(const MMMLink *l);
int      mmm_link_is_playing(const MMMLink *l);
uint64_t mmm_link_playing_time_ticks(const MMMLink *l);          // when the play state last changed
double   mmm_link_beat_at_ticks(const MMMLink *l, uint64_t ticks, double quantum);
uint64_t mmm_link_ticks_at_beat(const MMMLink *l, double beat, double quantum);

#ifdef __cplusplus
}
#endif
#endif
