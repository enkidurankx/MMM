{
  "patcher": {
    "fileversion": 1,
    "appversion": {
      "major": 8,
      "minor": 6,
      "revision": 2,
      "architecture": "x64",
      "modernui": 1
    },
    "classnamespace": "box",
    "rect": [
      100.0,
      100.0,
      900.0,
      640.0
    ],
    "bglocked": 0,
    "openinpresentation": 1,
    "default_fontsize": 12.0,
    "default_fontface": 0,
    "default_fontname": "Arial",
    "gridonopen": 1,
    "gridsize": [
      15.0,
      15.0
    ],
    "gridsnaponopen": 1,
    "objectsnaponopen": 1,
    "statusbarvisible": 2,
    "toolbarvisible": 1,
    "lefttoolbarpinned": 0,
    "toptoolbarpinned": 0,
    "righttoolbarpinned": 0,
    "bottomtoolbarpinned": 0,
    "toolbars_unpinned_last_save": 0,
    "tallnewobj": 0,
    "boxanimatetime": 200,
    "enablehscroll": 1,
    "enablevscroll": 1,
    "devicewidth": 480.0,
    "description": "MIDI DRIFTER random pitch-bend drift, 14 bit",
    "digest": "",
    "tags": "",
    "style": "",
    "subpatcher_template": "",
    "assistshowspatchername": 0,
    "boxes": [
      {
        "box": {
          "id": "obj-1",
          "maxclass": "newobj",
          "text": "midiin",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            30.0,
            56.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-2",
          "maxclass": "newobj",
          "text": "midiout",
          "numinlets": 1,
          "numoutlets": 0,
          "outlettype": [],
          "patching_rect": [
            30.0,
            82.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-3",
          "maxclass": "newobj",
          "text": "iter",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            30.0,
            108.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-7",
          "maxclass": "comment",
          "text": "MIDI DRIFTER",
          "textcolor": [
            1.0,
            0.6902,
            0.2275,
            1.0
          ],
          "fontname": "Arial",
          "fontsize": 9.0,
          "fontface": 1,
          "textjustification": 0,
          "presentation": 1,
          "presentation_rect": [
            16.0,
            12.0,
            110.0,
            12.0
          ],
          "patching_rect": [
            816.0,
            32.0,
            110.0,
            12.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-8",
          "maxclass": "comment",
          "text": "PITCH BEND · 14 BIT",
          "textcolor": [
            0.5412,
            0.5098,
            0.5882,
            1.0
          ],
          "fontname": "Arial",
          "fontsize": 7.0,
          "fontface": 0,
          "textjustification": 2,
          "presentation": 1,
          "presentation_rect": [
            112.0,
            12.0,
            116.0,
            12.0
          ],
          "patching_rect": [
            912.0,
            32.0,
            116.0,
            12.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-9",
          "maxclass": "multislider",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            ""
          ],
          "parameter_enable": 0,
          "size": 100,
          "setminmax": [
            -1.0,
            1.0
          ],
          "signed": 1,
          "setstyle": 1,
          "ignoreclick": 1,
          "bgcolor": [
            0.0353,
            0.0314,
            0.0471,
            1.0
          ],
          "slidercolor": [
            1.0,
            0.6902,
            0.2275,
            1.0
          ],
          "bordercolor": [
            0.2039,
            0.1843,
            0.2353,
            1.0
          ],
          "thickness": 1,
          "patching_rect": [
            814.0,
            48.0,
            216.0,
            76.0
          ],
          "presentation": 1,
          "presentation_rect": [
            14.0,
            28.0,
            216.0,
            76.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-10",
          "maxclass": "comment",
          "text": "BEND",
          "textcolor": [
            0.5412,
            0.5098,
            0.5882,
            1.0
          ],
          "fontname": "Arial",
          "fontsize": 7.5,
          "fontface": 1,
          "textjustification": 0,
          "presentation": 1,
          "presentation_rect": [
            16.0,
            116.0,
            60.0,
            11.0
          ],
          "patching_rect": [
            816.0,
            136.0,
            60.0,
            11.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-11",
          "maxclass": "flonum",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ],
          "parameter_enable": 0,
          "numdecimalplaces": 1,
          "triangle": 0,
          "ignoreclick": 1,
          "fontname": "Menlo",
          "fontsize": 20.0,
          "textcolor": [
            1.0,
            0.6902,
            0.2275,
            1.0
          ],
          "bgcolor": [
            0.0353,
            0.0314,
            0.0471,
            1.0
          ],
          "bordercolor": [
            0.0353,
            0.0314,
            0.0471,
            1.0
          ],
          "patching_rect": [
            814.0,
            146.0,
            96.0,
            30.0
          ],
          "presentation": 1,
          "presentation_rect": [
            14.0,
            126.0,
            96.0,
            30.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-12",
          "maxclass": "comment",
          "text": "% of the full bend range\n(= your synth's PB range)",
          "textcolor": [
            0.5412,
            0.5098,
            0.5882,
            1.0
          ],
          "fontname": "Arial",
          "fontsize": 7.0,
          "fontface": 0,
          "textjustification": 0,
          "presentation": 1,
          "presentation_rect": [
            112.0,
            134.0,
            120.0,
            22.0
          ],
          "patching_rect": [
            912.0,
            154.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-13",
          "maxclass": "live.dial",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "float"
          ],
          "patching_rect": [
            30.0,
            108.0,
            44.0,
            48.0
          ],
          "presentation": 1,
          "presentation_rect": [
            246.0,
            10.0,
            50.0,
            58.0
          ],
          "varname": "Rate",
          "fontname": "Arial",
          "fontsize": 9.0,
          "fontface": 1,
          "dialcolor": [
            0.2431,
            0.2235,
            0.2902,
            1.0
          ],
          "activedialcolor": [
            1.0,
            0.6902,
            0.2275,
            1.0
          ],
          "needlecolor": [
            0.8863,
            0.8627,
            0.9098,
            1.0
          ],
          "activeneedlecolor": [
            0.8863,
            0.8627,
            0.9098,
            1.0
          ],
          "textcolor": [
            0.8863,
            0.8627,
            0.9098,
            1.0
          ],
          "parameter_enable": 1,
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Rate",
              "parameter_shortname": "Rate",
              "parameter_type": 1,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                24
              ],
              "parameter_mmin": 0.0,
              "parameter_mmax": 100.0,
              "parameter_unitstyle": 0
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-14",
          "maxclass": "live.dial",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "float"
          ],
          "patching_rect": [
            30.0,
            108.0,
            44.0,
            48.0
          ],
          "presentation": 1,
          "presentation_rect": [
            300.0,
            10.0,
            50.0,
            58.0
          ],
          "varname": "Depth",
          "fontname": "Arial",
          "fontsize": 9.0,
          "fontface": 1,
          "dialcolor": [
            0.2431,
            0.2235,
            0.2902,
            1.0
          ],
          "activedialcolor": [
            1.0,
            0.6902,
            0.2275,
            1.0
          ],
          "needlecolor": [
            0.8863,
            0.8627,
            0.9098,
            1.0
          ],
          "activeneedlecolor": [
            0.8863,
            0.8627,
            0.9098,
            1.0
          ],
          "textcolor": [
            0.8863,
            0.8627,
            0.9098,
            1.0
          ],
          "parameter_enable": 1,
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Depth",
              "parameter_shortname": "Depth",
              "parameter_type": 1,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                10
              ],
              "parameter_mmin": 0.0,
              "parameter_mmax": 100.0,
              "parameter_unitstyle": 5
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-15",
          "maxclass": "live.dial",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "float"
          ],
          "patching_rect": [
            30.0,
            108.0,
            44.0,
            48.0
          ],
          "presentation": 1,
          "presentation_rect": [
            354.0,
            10.0,
            50.0,
            58.0
          ],
          "varname": "Glide",
          "fontname": "Arial",
          "fontsize": 9.0,
          "fontface": 1,
          "dialcolor": [
            0.2431,
            0.2235,
            0.2902,
            1.0
          ],
          "activedialcolor": [
            1.0,
            0.6902,
            0.2275,
            1.0
          ],
          "needlecolor": [
            0.8863,
            0.8627,
            0.9098,
            1.0
          ],
          "activeneedlecolor": [
            0.8863,
            0.8627,
            0.9098,
            1.0
          ],
          "textcolor": [
            0.8863,
            0.8627,
            0.9098,
            1.0
          ],
          "parameter_enable": 1,
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Glide",
              "parameter_shortname": "Glide",
              "parameter_type": 1,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                100
              ],
              "parameter_mmin": 0.0,
              "parameter_mmax": 100.0,
              "parameter_unitstyle": 5
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-16",
          "maxclass": "live.dial",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "float"
          ],
          "patching_rect": [
            30.0,
            108.0,
            44.0,
            48.0
          ],
          "presentation": 1,
          "presentation_rect": [
            408.0,
            10.0,
            50.0,
            58.0
          ],
          "varname": "Channel",
          "fontname": "Arial",
          "fontsize": 9.0,
          "fontface": 1,
          "dialcolor": [
            0.2431,
            0.2235,
            0.2902,
            1.0
          ],
          "activedialcolor": [
            1.0,
            0.6902,
            0.2275,
            1.0
          ],
          "needlecolor": [
            0.8863,
            0.8627,
            0.9098,
            1.0
          ],
          "activeneedlecolor": [
            0.8863,
            0.8627,
            0.9098,
            1.0
          ],
          "textcolor": [
            0.8863,
            0.8627,
            0.9098,
            1.0
          ],
          "parameter_enable": 1,
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Channel",
              "parameter_shortname": "Ch",
              "parameter_type": 1,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                1
              ],
              "parameter_mmin": 1.0,
              "parameter_mmax": 16.0,
              "parameter_unitstyle": 0
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-17",
          "maxclass": "live.text",
          "text": "RANDOM",
          "texton": "WALK",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            ""
          ],
          "patching_rect": [
            30.0,
            108.0,
            60.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            248.0,
            78.0,
            100.0,
            24.0
          ],
          "varname": "Mode",
          "mode": 1,
          "fontname": "Arial",
          "fontsize": 10.0,
          "fontface": 1,
          "bgcolor": [
            0.1725,
            0.1569,
            0.2039,
            1.0
          ],
          "bgoncolor": [
            0.3765,
            0.3451,
            0.4706,
            1.0
          ],
          "activebgcolor": [
            0.1725,
            0.1569,
            0.2039,
            1.0
          ],
          "activebgoncolor": [
            0.3765,
            0.3451,
            0.4706,
            1.0
          ],
          "textcolor": [
            0.8863,
            0.8627,
            0.9098,
            1.0
          ],
          "textoncolor": [
            1.0,
            1.0,
            1.0,
            1.0
          ],
          "activetextcolor": [
            0.8863,
            0.8627,
            0.9098,
            1.0
          ],
          "activetextoncolor": [
            1.0,
            1.0,
            1.0,
            1.0
          ],
          "bordercolor": [
            0.2902,
            0.2667,
            0.3451,
            1.0
          ],
          "focusbordercolor": [
            1.0,
            0.6902,
            0.2275,
            1.0
          ],
          "parameter_enable": 1,
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Mode",
              "parameter_shortname": "Mode",
              "parameter_type": 2,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                0
              ],
              "parameter_enum": [
                "off",
                "on"
              ],
              "parameter_mmax": 1
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-18",
          "maxclass": "live.text",
          "text": "CENTER",
          "texton": "CENTER",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            ""
          ],
          "patching_rect": [
            30.0,
            108.0,
            60.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            356.0,
            78.0,
            112.0,
            24.0
          ],
          "varname": "Center",
          "mode": 0,
          "fontname": "Arial",
          "fontsize": 10.0,
          "fontface": 1,
          "bgcolor": [
            0.1725,
            0.1569,
            0.2039,
            1.0
          ],
          "bgoncolor": [
            0.3765,
            0.3451,
            0.4706,
            1.0
          ],
          "activebgcolor": [
            0.1725,
            0.1569,
            0.2039,
            1.0
          ],
          "activebgoncolor": [
            0.3765,
            0.3451,
            0.4706,
            1.0
          ],
          "textcolor": [
            0.8863,
            0.8627,
            0.9098,
            1.0
          ],
          "textoncolor": [
            1.0,
            1.0,
            1.0,
            1.0
          ],
          "activetextcolor": [
            0.8863,
            0.8627,
            0.9098,
            1.0
          ],
          "activetextoncolor": [
            1.0,
            1.0,
            1.0,
            1.0
          ],
          "bordercolor": [
            0.2902,
            0.2667,
            0.3451,
            1.0
          ],
          "focusbordercolor": [
            1.0,
            0.6902,
            0.2275,
            1.0
          ],
          "parameter_enable": 0
        }
      },
      {
        "box": {
          "id": "obj-19",
          "maxclass": "live.text",
          "text": "DRIFT OFF",
          "texton": "DRIFT ON",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            ""
          ],
          "patching_rect": [
            30.0,
            108.0,
            60.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            248.0,
            116.0,
            220.0,
            38.0
          ],
          "varname": "Drift",
          "mode": 1,
          "fontname": "Arial",
          "fontsize": 10.0,
          "fontface": 1,
          "bgcolor": [
            0.1725,
            0.1569,
            0.2039,
            1.0
          ],
          "bgoncolor": [
            1.0,
            0.6902,
            0.2275,
            1.0
          ],
          "activebgcolor": [
            0.1725,
            0.1569,
            0.2039,
            1.0
          ],
          "activebgoncolor": [
            1.0,
            0.6902,
            0.2275,
            1.0
          ],
          "textcolor": [
            0.8863,
            0.8627,
            0.9098,
            1.0
          ],
          "textoncolor": [
            0.1882,
            0.1176,
            0.0157,
            1.0
          ],
          "activetextcolor": [
            0.8863,
            0.8627,
            0.9098,
            1.0
          ],
          "activetextoncolor": [
            0.1882,
            0.1176,
            0.0157,
            1.0
          ],
          "bordercolor": [
            1.0,
            0.6902,
            0.2275,
            1.0
          ],
          "focusbordercolor": [
            1.0,
            0.6902,
            0.2275,
            1.0
          ],
          "parameter_enable": 1,
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Drift",
              "parameter_shortname": "Drift",
              "parameter_type": 2,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                1
              ],
              "parameter_enum": [
                "off",
                "on"
              ],
              "parameter_mmax": 1
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-20",
          "maxclass": "comment",
          "text": "RANDOM = any target · WALK = small steps from the last one",
          "textcolor": [
            0.5412,
            0.5098,
            0.5882,
            1.0
          ],
          "fontname": "Arial",
          "fontsize": 6.5,
          "fontface": 0,
          "textjustification": 0,
          "presentation": 1,
          "presentation_rect": [
            248.0,
            103.0,
            220.0,
            10.0
          ],
          "patching_rect": [
            1048.0,
            123.0,
            220.0,
            10.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-21",
          "maxclass": "newobj",
          "text": "metro 1000",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            "bang"
          ],
          "patching_rect": [
            30.0,
            134.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-22",
          "maxclass": "newobj",
          "text": "random 2001",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            30.0,
            160.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-23",
          "maxclass": "newobj",
          "text": "- 1000",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            30.0,
            186.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-24",
          "maxclass": "newobj",
          "text": "/ 1000.",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            "float"
          ],
          "patching_rect": [
            30.0,
            212.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-25",
          "maxclass": "newobj",
          "text": "expr $f1*(1.-0.65*$i2)+$i2*$f3",
          "numinlets": 3,
          "numoutlets": 1,
          "outlettype": [
            "float"
          ],
          "patching_rect": [
            30.0,
            238.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-26",
          "maxclass": "newobj",
          "text": "clip -1. 1.",
          "numinlets": 3,
          "numoutlets": 1,
          "outlettype": [
            "float"
          ],
          "patching_rect": [
            30.0,
            264.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-27",
          "maxclass": "newobj",
          "text": "t f f",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "float",
            "float"
          ],
          "patching_rect": [
            30.0,
            290.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-28",
          "maxclass": "newobj",
          "text": "pak 0. 0.",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            30.0,
            316.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-29",
          "maxclass": "newobj",
          "text": "line 0. 10",
          "numinlets": 3,
          "numoutlets": 2,
          "outlettype": [
            "float",
            "bang"
          ],
          "patching_rect": [
            30.0,
            342.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-30",
          "maxclass": "newobj",
          "text": "expr 4000.*exp(-4.60517*$f1/100.)",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "float"
          ],
          "patching_rect": [
            30.0,
            368.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-31",
          "maxclass": "newobj",
          "text": "t f f f",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "float",
            "float",
            "float"
          ],
          "patching_rect": [
            30.0,
            394.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-32",
          "maxclass": "newobj",
          "text": "f",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            "float"
          ],
          "patching_rect": [
            30.0,
            420.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-33",
          "maxclass": "newobj",
          "text": "expr $f1*$f2/100.",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            "float"
          ],
          "patching_rect": [
            30.0,
            446.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-34",
          "maxclass": "newobj",
          "text": "t b f",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "bang",
            "float"
          ],
          "patching_rect": [
            30.0,
            472.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-35",
          "maxclass": "newobj",
          "text": "sel 0",
          "numinlets": 2,
          "numoutlets": 2,
          "outlettype": [
            "bang",
            ""
          ],
          "patching_rect": [
            30.0,
            498.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-36",
          "maxclass": "newobj",
          "text": "t b b",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "bang",
            "bang"
          ],
          "patching_rect": [
            30.0,
            524.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-37",
          "maxclass": "message",
          "text": "0.",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            160.0,
            60.0,
            40.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-38",
          "maxclass": "message",
          "text": "0. 150",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            160.0,
            90.0,
            60.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-39",
          "maxclass": "newobj",
          "text": "t f f f",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "float",
            "float",
            "float"
          ],
          "patching_rect": [
            30.0,
            550.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-40",
          "maxclass": "newobj",
          "text": "f",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            "float"
          ],
          "patching_rect": [
            200.0,
            56.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-41",
          "maxclass": "newobj",
          "text": "expr int(8192.+$f1*$f2*81.91)",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            200.0,
            82.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-42",
          "maxclass": "newobj",
          "text": "clip 0 16383",
          "numinlets": 3,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            200.0,
            108.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-43",
          "maxclass": "newobj",
          "text": "change",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "int",
            "int",
            "int"
          ],
          "patching_rect": [
            200.0,
            134.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-44",
          "maxclass": "newobj",
          "text": "t b f",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "bang",
            "float"
          ],
          "patching_rect": [
            200.0,
            160.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-45",
          "maxclass": "newobj",
          "text": "t i b i i",
          "numinlets": 1,
          "numoutlets": 4,
          "outlettype": [
            "int",
            "bang",
            "int",
            "int"
          ],
          "patching_rect": [
            200.0,
            186.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-46",
          "maxclass": "newobj",
          "text": ">> 7",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            200.0,
            212.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-47",
          "maxclass": "newobj",
          "text": "& 127",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            200.0,
            238.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-48",
          "maxclass": "newobj",
          "text": "i 224",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            200.0,
            264.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-49",
          "maxclass": "newobj",
          "text": "+ 223",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            200.0,
            290.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-50",
          "maxclass": "newobj",
          "text": "pack 224 0 0",
          "numinlets": 3,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            200.0,
            316.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-51",
          "maxclass": "newobj",
          "text": "expr ($i1-8192)/81.91",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "float"
          ],
          "patching_rect": [
            200.0,
            342.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-52",
          "maxclass": "newobj",
          "text": "speedlim 50",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            200.0,
            368.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-53",
          "maxclass": "newobj",
          "text": "zl.stream 100",
          "numinlets": 2,
          "numoutlets": 2,
          "outlettype": [
            "",
            ""
          ],
          "patching_rect": [
            200.0,
            394.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-6",
          "maxclass": "panel",
          "background": 1,
          "ignoreclick": 1,
          "bgcolor": [
            1.0,
            0.6902,
            0.2275,
            1.0
          ],
          "border": 0,
          "rounded": 0.0,
          "mode": 0,
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            808.0,
            130.0,
            228.0,
            2.0
          ],
          "presentation": 1,
          "presentation_rect": [
            8.0,
            110.0,
            228.0,
            2.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-5",
          "maxclass": "panel",
          "background": 1,
          "ignoreclick": 1,
          "bgcolor": [
            0.0353,
            0.0314,
            0.0471,
            1.0
          ],
          "border": 1,
          "rounded": 6.0,
          "mode": 0,
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            808.0,
            28.0,
            228.0,
            153.0
          ],
          "presentation": 1,
          "presentation_rect": [
            8.0,
            8.0,
            228.0,
            153.0
          ],
          "bordercolor": [
            0.2039,
            0.1843,
            0.2353,
            1.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-4",
          "maxclass": "panel",
          "background": 1,
          "ignoreclick": 1,
          "bgcolor": [
            0.0745,
            0.0667,
            0.0863,
            1.0
          ],
          "border": 1,
          "rounded": 8.0,
          "mode": 1,
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            800.0,
            20.0,
            480.0,
            169.0
          ],
          "presentation": 1,
          "presentation_rect": [
            0.0,
            0.0,
            480.0,
            169.0
          ],
          "bordercolor": [
            0.2275,
            0.2039,
            0.251,
            1.0
          ],
          "grad1": [
            0.1333,
            0.1216,
            0.149,
            1.0
          ],
          "grad2": [
            0.0745,
            0.0667,
            0.0863,
            1.0
          ],
          "proportion": 0.5,
          "bgfillcolor": {
            "angle": 270.0,
            "autogradient": 0,
            "color": [
              0.0745,
              0.0667,
              0.0863,
              1.0
            ],
            "color1": [
              0.1333,
              0.1216,
              0.149,
              1.0
            ],
            "color2": [
              0.0745,
              0.0667,
              0.0863,
              1.0
            ],
            "proportion": 0.5,
            "type": "gradient"
          }
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "destination": [
            "obj-2",
            0
          ],
          "source": [
            "obj-1",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-2",
            0
          ],
          "source": [
            "obj-3",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-22",
            0
          ],
          "source": [
            "obj-21",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-23",
            0
          ],
          "source": [
            "obj-22",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-24",
            0
          ],
          "source": [
            "obj-23",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-25",
            0
          ],
          "source": [
            "obj-24",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-26",
            0
          ],
          "source": [
            "obj-25",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-27",
            0
          ],
          "source": [
            "obj-26",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-25",
            2
          ],
          "source": [
            "obj-27",
            1
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-28",
            0
          ],
          "source": [
            "obj-27",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-29",
            0
          ],
          "source": [
            "obj-28",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-25",
            1
          ],
          "source": [
            "obj-17",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-30",
            0
          ],
          "source": [
            "obj-13",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-31",
            0
          ],
          "source": [
            "obj-30",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-21",
            1
          ],
          "source": [
            "obj-31",
            2
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-32",
            1
          ],
          "source": [
            "obj-31",
            1
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-33",
            0
          ],
          "source": [
            "obj-31",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-28",
            1
          ],
          "source": [
            "obj-33",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-34",
            0
          ],
          "source": [
            "obj-15",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-33",
            1
          ],
          "source": [
            "obj-34",
            1
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-32",
            0
          ],
          "source": [
            "obj-34",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-33",
            0
          ],
          "source": [
            "obj-32",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-21",
            0
          ],
          "source": [
            "obj-19",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-35",
            0
          ],
          "source": [
            "obj-19",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-36",
            0
          ],
          "source": [
            "obj-35",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-36",
            0
          ],
          "source": [
            "obj-18",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-37",
            0
          ],
          "source": [
            "obj-36",
            1
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-25",
            2
          ],
          "source": [
            "obj-37",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-38",
            0
          ],
          "source": [
            "obj-36",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-29",
            0
          ],
          "source": [
            "obj-38",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-39",
            0
          ],
          "source": [
            "obj-29",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-40",
            1
          ],
          "source": [
            "obj-39",
            1
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-41",
            0
          ],
          "source": [
            "obj-39",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-44",
            0
          ],
          "source": [
            "obj-14",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-41",
            1
          ],
          "source": [
            "obj-44",
            1
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-40",
            0
          ],
          "source": [
            "obj-44",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-41",
            0
          ],
          "source": [
            "obj-40",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-42",
            0
          ],
          "source": [
            "obj-41",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-43",
            0
          ],
          "source": [
            "obj-42",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-45",
            0
          ],
          "source": [
            "obj-43",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-46",
            0
          ],
          "source": [
            "obj-45",
            3
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-50",
            2
          ],
          "source": [
            "obj-46",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-47",
            0
          ],
          "source": [
            "obj-45",
            2
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-50",
            1
          ],
          "source": [
            "obj-47",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-48",
            0
          ],
          "source": [
            "obj-45",
            1
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-50",
            0
          ],
          "source": [
            "obj-48",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-49",
            0
          ],
          "source": [
            "obj-16",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-48",
            1
          ],
          "source": [
            "obj-49",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-3",
            0
          ],
          "source": [
            "obj-50",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-51",
            0
          ],
          "source": [
            "obj-45",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-11",
            0
          ],
          "source": [
            "obj-51",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-52",
            0
          ],
          "source": [
            "obj-39",
            2
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-53",
            0
          ],
          "source": [
            "obj-52",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-9",
            0
          ],
          "source": [
            "obj-53",
            0
          ]
        }
      }
    ]
  }
}
