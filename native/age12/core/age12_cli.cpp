// age12_cli in.f32 out.f32 sampleRate semis targetRate bits pre companded filtCut filtRes sat noise asym maxSemis
#include "age12_core.h"
#include <cstdio>
#include <cstdlib>
int main(int argc, char** argv) {
    if (argc < 15) { std::fprintf(stderr, "usage: see source\n"); return 1; }
    age12::Params p;
    p.sampleRate = atof(argv[3]); p.semitones = atof(argv[4]); p.targetRate = atof(argv[5]); p.bits = atoi(argv[6]);
    p.preFilter = atof(argv[7]); p.companded = atoi(argv[8]) != 0; p.filtCut = atof(argv[9]); p.filtRes = atof(argv[10]);
    p.sat = atof(argv[11]); p.noise = atof(argv[12]); p.asym = atof(argv[13]);
    age12::Stream s(atof(argv[14]));
    s.setParams(p); s.reset();
    FILE* f = std::fopen(argv[1], "rb"); std::fseek(f, 0, SEEK_END); long n = std::ftell(f) / 4; std::fseek(f, 0, SEEK_SET);
    std::vector<float> in(n), out(n);
    if (std::fread(in.data(), 4, n, f) != (size_t)n) return 2;
    std::fclose(f);
    for (long i = 0; i < n; ++i) out[i] = s.process(in[i]);
    f = std::fopen(argv[2], "wb"); std::fwrite(out.data(), 4, n, f); std::fclose(f);
    std::printf("%d\n", s.latency());
    return 0;
}
