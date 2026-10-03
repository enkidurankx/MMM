#!/usr/bin/env python3
"""Structural check of the generated patchers: valid .amxd container, every patchline points at an existing box and a
valid outlet/inlet for the objects whose port counts are known, and every control that must reach gen~ does."""
import json, struct, sys, re

OUT = {"metro": 1, "counter": 4, "route": None, "prepend": 1, "thispatcher": 2, "sprintf": 1, "deferlow": 1, "!/": 1, "==": 1, "+": 1,
       "pak": 1, "line~": 1, "*~": 1, "+~": 1, "receive~": 1, "plugin~": 2, "plugout~": 0, "send~": 0}
IN = {"metro": 2, "prepend": 1, "deferlow": 1, "!/": 2, "==": 2, "+": 2, "pak": 2, "line~": 2, "*~": 2, "+~": 2, "receive~": 1, "plugout~": 2, "send~": 1, "sprintf": 1, "counter": 3}

def load_amxd(fn):
    b = open(fn, "rb").read()
    assert b[:4] == b"ampf" and b[8:12] == b"aaaa" and b[12:16] == b"meta" and b[24:28] == b"ptch", "bad container"
    n = struct.unpack("<I", b[28:32])[0]
    assert len(b) == 32 + n, "ptch length mismatch"
    return json.loads(b[32:])

def check(fn, want_gen):
    doc = load_amxd(fn + ".amxd")
    assert doc == json.loads(open(fn + ".maxpat").read()), "amxd and maxpat differ"
    boxes = {b["box"]["id"]: b["box"] for b in doc["patcher"]["boxes"]}
    assert len(boxes) == len(doc["patcher"]["boxes"]), "duplicate ids"
    vn = [b["varname"] for b in boxes.values() if "varname" in b]
    assert len(vn) == len(set(vn)), "duplicate varnames"
    ln = [b["saved_attribute_attributes"]["valueof"]["parameter_longname"] for b in boxes.values() if "saved_attribute_attributes" in b]
    assert len(ln) == len(set(ln)), "duplicate parameter longnames"
    for l in doc["patcher"]["lines"]:
        s, d = l["patchline"]["source"], l["patchline"]["destination"]
        assert s[0] in boxes and d[0] in boxes, f"dangling line {l}"
        for ref, port, table in ((boxes[s[0]], s[1], OUT), (boxes[d[0]], d[1], IN)):
            t = ref.get("text", "").split(" ")[0]
            if ref["maxclass"] == "newobj" and t in table and table[t] is not None:
                assert port < table[t], f"{t}: port {port} out of range in {l}"
    # every message box that talks to thispatcher names existing varnames
    for b in boxes.values():
        if b["maxclass"] == "message" and b["text"].startswith("script sendbox"):
            for name in re.findall(r"script sendbox (\S+) hidden", b["text"]):
                assert name in vn, f"unknown varname {name}"
    if want_gen:
        gen = [b for b in boxes.values() if b.get("text") == "gen~"][0]
        code = [x["box"] for x in gen["patcher"]["boxes"] if x["box"]["maxclass"] == "codebox"][0]["code"]
        params = set(re.findall(r"^Param (\w+)\(", code, re.M))
        sent = {b["text"].split(" ")[1] for b in boxes.values() if b.get("text", "").startswith("prepend ")}
        assert sent <= params, f"messages to unknown gen~ params: {sent - params}"
        # every Param except the ones set only by the LFO/menus must be reachable
        unreachable = params - sent
        assert not unreachable, f"gen~ params with no control: {unreachable}"
        assert gen["numoutlets"] == 8
    print(fn, "ok:", len(boxes), "boxes,", len(doc["patcher"]["lines"]), "lines")

check("MMM_VocalChopper", True)
check("MMM_ChopOut", False)
