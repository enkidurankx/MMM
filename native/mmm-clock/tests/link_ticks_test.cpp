// Self-test of the Link tick logic against the real Link SDK (Linux build, ticks == microseconds).
// It mirrors ClockEngine.emitLinkTick(): tick k at beat k/24, never out of order, MIDI Start at the
// tick closest to the session's play-state change. Proves the Link semantics we rely on, NOT the Swift code.
#include "mmm_link.h"
#include <cstdio>
#include <cmath>
#include <vector>
#include <thread>
#include <chrono>
static int fails = 0;
#define CHECK(c, ...) do { bool ok_ = (c); std::printf("%s ", ok_ ? "ok  " : "FAIL"); std::printf(__VA_ARGS__); std::printf("\n"); if (!ok_) fails++; } while (0)

int main()
{
    const double Q = 4.0;
    MMMLink *l = mmm_link_create(120.0);
    mmm_link_enable_start_stop(l, 1);
    mmm_link_enable(l, 1);
    CHECK(mmm_link_is_enabled(l) == 1, "Link enabled, peers=%d", mmm_link_num_peers(l));

    mmm_link_capture(l);
    double t0 = (double)mmm_link_now_ticks(l);
    double beat = mmm_link_beat_at_ticks(l, (uint64_t)t0, Q);
    long long idx = (long long)std::ceil(beat * 24);
    std::vector<double> times; std::vector<long long> ids;
    double last = 0;
    bool playing = false; double startTick = -1, stopTick = -1; int starts = 0, stops = 0;
    // generate ticks "ahead" for 4 s of wall time in 25 ms chunks while the app thread changes things
    double endTime = t0 + 4.0e6;
    bool tempoSet = false, playSet = false, stopSet = false;
    while (true) {
        double now = (double)mmm_link_now_ticks(l);
        if (!tempoSet && now > t0 + 1.0e6) { mmm_link_app_set_tempo(l, 150.0); tempoSet = true; }
        if (!playSet && now > t0 + 1.5e6) { mmm_link_app_set_playing(l, 1, Q); playSet = true; }
        if (!stopSet && now > t0 + 3.0e6) { mmm_link_app_set_playing(l, 0, Q); stopSet = true; }
        while (true) {
            mmm_link_capture(l);
            double tempo = mmm_link_tempo(l);
            double period = 60.0e6 / (tempo * 24.0);
            double probe = last > 0 ? last + period * 0.5 : t0;
            idx = (long long)std::ceil(mmm_link_beat_at_ticks(l, (uint64_t)probe, Q) * 24);
            double t = (double)mmm_link_ticks_at_beat(l, (double)idx / 24.0, Q);
            if (t > now + 65e3) break;            // generate 65 ms ahead like the engine
            if (t < last + period * 0.25) t = last + period * 0.25;
            int lp = mmm_link_is_playing(l);
            double due = (double)mmm_link_playing_time_ticks(l);
            if (lp && !playing) {   // same rule as the engine: Start on the first bar line at/after the start time
                double bb = mmm_link_beat_at_ticks(l, (uint64_t)due, Q);
                double sb = std::ceil(bb / Q - 1e-4) * Q;
                due = (double)mmm_link_ticks_at_beat(l, sb, Q);
            }
            if (lp != (int)playing && t >= due - period / 2) {
                if (lp) { startTick = t; starts++; } else { stopTick = t; stops++; }
                playing = lp;
            }
            times.push_back(t); ids.push_back(idx); last = t; idx++;
        }
        if (now > endTime) break;
        std::this_thread::sleep_for(std::chrono::milliseconds(5));
    }
    CHECK(times.size() > 200, "%zu ticks generated in 4 s", times.size());
    bool mono = true; double worstRel = 0; int n150 = 0;
    for (size_t i = 1; i < times.size(); i++) {
        if (times[i] <= times[i-1]) mono = false;
    }
    CHECK(mono, "tick times strictly increasing across the tempo change");
    // spacing: before the change 120 bpm -> 20833 us, after 150 bpm -> 16667 us
    double s1 = 0, s2 = 0; int c1 = 0, c2 = 0;
    for (size_t i = 1; i < times.size(); i++) {
        double d = times[i] - times[i-1];
        if (std::fabs(d - 20833.3) < 400) { s1 += d; c1++; }
        else if (std::fabs(d - 16666.7) < 400) { s2 += d; c2++; }
    }
    CHECK(c1 > 20 && std::fabs(s1 / c1 - 20833.3) < 20, "120 BPM spacing %.1f us (n=%d)", c1 ? s1 / c1 : 0, c1);
    CHECK(c2 > 20 && std::fabs(s2 / c2 - 16666.7) < 20, "150 BPM spacing %.1f us (n=%d)", c2 ? s2 / c2 : 0, c2);
    double maxStep = 0;
    for (size_t i = 1; i < times.size(); i++) maxStep = std::fmax(maxStep, times[i] - times[i-1]);
    CHECK(maxStep < 25000, "no gap larger than one 120-BPM period (max %.0f us)", maxStep);
    CHECK(starts == 1 && stops == 1, "exactly one MIDI Start (%d) and one Stop (%d)", starts, stops);
    // start tick lies on beat 0 of the session timeline (quantum-aligned)
    mmm_link_capture(l);
    double sb = mmm_link_beat_at_ticks(l, (uint64_t)startTick, Q);
    CHECK(std::fabs(std::fmod(sb + 0.01, Q)) < 0.03, "Start sits on a bar line (beat %.4f, quantum %.0f)", sb, Q);
    CHECK(startTick > 0 && stopTick > startTick, "Stop comes after Start (%.0f ms later)", (stopTick - startTick) / 1000);
    mmm_link_destroy(l);
    std::printf(fails ? "FAILED\n" : "ALL OK\n");
    return fails ? 1 : 0;
}
