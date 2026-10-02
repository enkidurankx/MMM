// AGE·12 — streaming (real-time) version of the AGE·12 sample-ager chain.
//
// The web app pitches a whole buffer up, crushes it, then pitches it back down.
// That needs no "whole sample" at all if both resamplers run lazily on a fractional clock:
//   * writer:  y[k] = x(k*r)            (vari-speed pitch up, linear interpolation)  -> pre-LP -> S&H -> quantise -> q[k]
//   * reader:  out[j] = q(j/r)          (vari-speed pitch down, linear interpolation)
// y[k] only needs input up to x(k*r)+1, so the whole thing runs with a small fixed latency
// (ceil(rMax)+2 samples) and is sample-for-sample what the offline chain produces.
// Reconstruction filter and analog stage run afterwards at the host rate, exactly as in the app.
#pragma once
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <vector>

namespace age12 {

struct Params {
    double sampleRate = 44100.0;
    double semitones  = 12.0;     // pitch-up before the crush
    double targetRate = 26040.0;  // S&H rate in the pitched-up domain
    int    bits       = 12;
    double preFilter  = 0.0;      // 0..1
    bool   companded  = false;    // MPC-style log quantiser
    double filtCut = 11000.0, filtRes = 0.30, sat = 0.30, noise = 0.12, asym = 0.25;
};

class Stream {
public:
    explicit Stream(double maxSemitones = 24.0) {
        const double rMax = std::pow(2.0, maxSemitones / 12.0);
        latency_ = (int)std::ceil(rMax) + 2;
        xMask_ = pow2(rMax * 2 + 32) - 1;
        qMask_ = pow2(64 + latency_) - 1;
        yMask_ = 8191;
        x_.assign(xMask_ + 1, 0.f);
        q_.assign(qMask_ + 1, 0.f);
        y_.assign(yMask_ + 1, 0.f);
        setParams(Params());
    }

    int latency() const { return latency_; }

    void setParams(const Params& p) {
        const double R = p.sampleRate;
        r_ = p.semitones > 0 ? std::pow(2.0, p.semitones / 12.0) : 1.0;
        if (r_ <= 1.0) r_ = 1.0;
        inv_ = 1.0 / r_;
        step_ = R / p.targetRate;
        preOn_ = p.preFilter > 0;
        const double cut = R * 0.45 * (1 - p.preFilter) + p.targetRate * 0.45 * p.preFilter;
        if (cut > 0) { preX_ = std::exp(-2 * M_PI * cut / R); preA_ = 1 - preX_; } else preOn_ = false;
        levels_ = std::pow(2.0, p.bits - 1) - 1;
        companded_ = p.companded;
        lnK1_ = std::log1p(55.0);
        double fc = p.filtCut / (R * 0.5);
        fc = std::min(0.99, std::max(0.001, fc));
        f_ = fc * 1.16;
        fb_ = p.filtRes * 4.0 * (1.0 - 0.15 * f_ * f_);
        sat_ = p.sat; noiseAmt_ = p.noise; asym_ = p.asym;
        drive_ = 1 + p.sat * 3;
        driveNorm_ = std::tanh(drive_); if (driveNorm_ == 0) driveNorm_ = 1;
    }

    void reset() {
        std::fill(x_.begin(), x_.end(), 0.f); std::fill(q_.begin(), q_.end(), 0.f); std::fill(y_.begin(), y_.end(), 0.f);
        n_ = -1; k_ = 0; kLast_ = -1; ySrc_ = 0; outPos_ = 0; z_ = 0; s1_ = s2_ = s3_ = s4_ = 0; seed_ = 2654435761.0;
    }

    float process(float in) {
        ++n_;
        x_[n_ & xMask_] = in;

        // writer: produce every pitched-up sample whose two neighbours have arrived
        for (;;) {
            const int64_t i0 = (int64_t)std::floor(ySrc_);
            const int64_t i1 = i0 + 1;
            if (i1 > n_) break;
            const double a = x_[i0 & xMask_], b = x_[i1 & xMask_];
            float y = (float)(a + (b - a) * (ySrc_ - (double)i0));
            if (preOn_) { z_ = preA_ * y + preX_ * z_; y = (float)z_; }
            y_[k_ & yMask_] = y;
            float h = y;
            if (step_ > 1.0) {
                const double holdStart = std::floor((double)k_ / step_) * step_;
                int64_t src = (int64_t)std::floor(holdStart + 0.5);
                if (src > k_) src = k_;
                h = y_[src & yMask_];
            }
            q_[k_ & qMask_] = quantise(h);
            kLast_ = k_;
            ++k_;
            ySrc_ += r_;
        }

        if (n_ < latency_) return 0.f;

        // reader: pitch back down
        int64_t i0 = (int64_t)std::floor(outPos_);
        double frac = outPos_ - (double)i0;
        int64_t i1 = i0 + 1;
        if (i1 > kLast_) { i1 = kLast_; if (i0 > kLast_) i0 = kLast_; }
        const double va = q_[i0 & qMask_], vb = q_[i1 & qMask_];
        const float v = (float)(va + (vb - va) * frac);
        outPos_ += inv_;

        // reconstruction filter (4-pole ladder with tanh in the feedback path)
        double inp = v - fb_ * s4_;
        inp = std::tanh(inp);
        s1_ += f_ * (inp - s1_); s2_ += f_ * (s1_ - s2_); s3_ += f_ * (s2_ - s3_); s4_ += f_ * (s3_ - s4_);
        float o = (float)s4_;

        // analog output stage
        double w = o;
        if (asym_ > 0 && w < 0) w = w * (1 + asym_ * 0.35);
        if (sat_ > 0) w = std::tanh(w * drive_) / driveNorm_;
        if (noiseAmt_ > 0) {
            // kept identical to the web app (double arithmetic, then ToInt32 & 0x7fffffff) so the null test is exact
            const double p = seed_ * 1103515245.0 + 12345.0;
            seed_ = (double)((uint32_t)(uint64_t)std::fmod(p, 4294967296.0) & 0x7fffffffu);
            w += (seed_ / 2147483647.0 - 0.5) * noiseAmt_ * 0.02;
        }
        return (float)w;
    }

private:
    static size_t pow2(double v) { size_t p = 16; while ((double)p < v) p <<= 1; return p; }
    static double jsRound(double v) { return std::floor(v + 0.5); }   // Math.round: halves go up

    float quantise(float v0) const {
        double v = v0; if (v > 1) v = 1; if (v < -1) v = -1;
        if (!companded_) return (float)(jsRound(v * levels_) / levels_);
        const double sign = v < 0 ? -1 : 1, a = std::fabs(v);
        const double c = std::log1p(55.0 * a) / lnK1_;
        const double qn = jsRound(sign * c * levels_);
        const double c2 = std::fabs(qn) / levels_;
        return (float)((qn < 0 ? -1 : 1) * (std::expm1(c2 * lnK1_) / 55.0));
    }

    std::vector<float> x_, q_, y_;
    size_t xMask_ = 0, qMask_ = 0, yMask_ = 0;
    int latency_ = 0;
    int64_t n_ = -1, k_ = 0, kLast_ = -1;
    double ySrc_ = 0, outPos_ = 0, z_ = 0, s1_ = 0, s2_ = 0, s3_ = 0, s4_ = 0, seed_ = 2654435761.0;
    double r_ = 1, inv_ = 1, step_ = 1, preX_ = 0, preA_ = 1, levels_ = 2047, lnK1_ = 0, f_ = 0, fb_ = 0;
    double sat_ = 0, noiseAmt_ = 0, asym_ = 0, drive_ = 1, driveNorm_ = 1;
    bool preOn_ = false, companded_ = false;
};

}  // namespace age12
