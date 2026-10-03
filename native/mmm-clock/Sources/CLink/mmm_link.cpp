#include "mmm_link.h"
#include <ableton/Link.hpp>
#include <chrono>
#include <cmath>
#include <memory>

#ifdef __APPLE__
#define TICKS_TO_MICROS(l, t) ((l)->link.clock().ticksToMicros(t))
#define MICROS_TO_TICKS(l, m) ((l)->link.clock().microsToTicks(m))
#else   // only used for the Linux self-test of this file: ticks == microseconds
#define TICKS_TO_MICROS(l, t) (std::chrono::microseconds{static_cast<long long>(t)})
#define MICROS_TO_TICKS(l, m) (static_cast<uint64_t>((m).count() < 0 ? 0 : (m).count()))
#endif

struct MMMLink {
    explicit MMMLink(double bpm) : link(bpm), snap(link.captureAppSessionState()) {}
    ableton::Link link;
    ableton::Link::SessionState snap;       // engine thread only
};

MMMLink *mmm_link_create(double bpm) { return new MMMLink(bpm); }
void mmm_link_destroy(MMMLink *l) { delete l; }

void mmm_link_enable(MMMLink *l, int on) { l->link.enable(on != 0); }
int mmm_link_is_enabled(const MMMLink *l) { return l->link.isEnabled() ? 1 : 0; }
void mmm_link_enable_start_stop(MMMLink *l, int on) { l->link.enableStartStopSync(on != 0); }
int mmm_link_is_start_stop_enabled(const MMMLink *l) { return l->link.isStartStopSyncEnabled() ? 1 : 0; }
int mmm_link_num_peers(const MMMLink *l) { return static_cast<int>(l->link.numPeers()); }
uint64_t mmm_link_now_ticks(const MMMLink *l)
{
    return MICROS_TO_TICKS(l, l->link.clock().micros());
}

double mmm_link_app_tempo(MMMLink *l) { return l->link.captureAppSessionState().tempo(); }

void mmm_link_app_set_tempo(MMMLink *l, double bpm)
{
    auto s = l->link.captureAppSessionState();
    if (std::abs(s.tempo() - bpm) < 0.001) return;      // no echo of a tempo we only just read
    s.setTempo(bpm, l->link.clock().micros());
    l->link.commitAppSessionState(s);
}

int mmm_link_app_is_playing(MMMLink *l) { return l->link.captureAppSessionState().isPlaying() ? 1 : 0; }

void mmm_link_app_set_playing(MMMLink *l, int playing, double quantum)
{
    auto s = l->link.captureAppSessionState();
    // Start 200 ms ahead: the engine has already queued ticks up to ~65 ms into the future, so the new
    // beat grid (beat 0 at the start time) can begin cleanly on a tick instead of inside queued ones.
    if (playing) s.setIsPlayingAndRequestBeatAtTime(true, l->link.clock().micros() + std::chrono::milliseconds(200), 0.0, quantum);
    else s.setIsPlaying(false, l->link.clock().micros());
    l->link.commitAppSessionState(s);
}

void mmm_link_capture(MMMLink *l) { l->snap = l->link.captureAudioSessionState(); }
double mmm_link_tempo(const MMMLink *l) { return l->snap.tempo(); }
int mmm_link_is_playing(const MMMLink *l) { return l->snap.isPlaying() ? 1 : 0; }
uint64_t mmm_link_playing_time_ticks(const MMMLink *l)
{
    return MICROS_TO_TICKS(l, l->snap.timeForIsPlaying());
}
double mmm_link_beat_at_ticks(const MMMLink *l, uint64_t ticks, double quantum)
{
    return l->snap.beatAtTime(TICKS_TO_MICROS(l, ticks), quantum);
}
uint64_t mmm_link_ticks_at_beat(const MMMLink *l, double beat, double quantum)
{
    return MICROS_TO_TICKS(l, l->snap.timeAtBeat(beat, quantum));
}
