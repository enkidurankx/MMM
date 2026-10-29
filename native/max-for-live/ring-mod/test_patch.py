#!/usr/bin/env python3
"""Structural check of MMM_RingMod: valid .amxd container, amxd == maxpat, no dangling lines, unique varnames/longnames,
every gen~ Param has a control and every control reaches an existing Param."""
import json, struct, re
b = open("MMM_RingMod.amxd", "rb").read()
assert b[:4] == b"ampf" and b[8:12] == b"aaaa" and b[12:16] == b"meta" and b[24:28] == b"ptch", "bad container"
n = struct.unpack("<I", b[28:32])[0]
assert len(b) == 32 + n, "ptch length mismatch"
doc = json.loads(b[32:])
assert doc == json.loads(open("MMM_RingMod.maxpat").read()), "amxd and maxpat differ"
boxes = {x["box"]["id"]: x["box"] for x in doc["patcher"]["boxes"]}
assert len(boxes) == len(doc["patcher"]["boxes"]), "duplicate ids"
vn = [x["varname"] for x in boxes.values() if "varname" in x]
assert len(vn) == len(set(vn)), "duplicate varnames"
ln = [x["saved_attribute_attributes"]["valueof"]["parameter_longname"] for x in boxes.values() if "saved_attribute_attributes" in x]
assert len(ln) == len(set(ln)), "duplicate parameter longnames"
for l in doc["patcher"]["lines"]:
    s, d = l["patchline"]["source"], l["patchline"]["destination"]
    assert s[0] in boxes and d[0] in boxes, f"dangling line {l}"
gen = [x for x in boxes.values() if x.get("text") == "gen~"][0]
code = [x["box"] for x in gen["patcher"]["boxes"] if x["box"]["maxclass"] == "codebox"][0]["code"]
params = set(re.findall(r"^Param (\w+)\(", code, re.M))
sent = {x["text"].split(" ")[1] for x in boxes.values() if x.get("text", "").startswith("prepend ")}
assert sent == params, f"params without control {params - sent}, controls without param {sent - params}"
assert gen["numoutlets"] == 2
print("MMM_RingMod ok:", len(boxes), "boxes,", len(doc["patcher"]["lines"]), "lines,", len(params), "params")
