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
    "description": "PC·CONTROL program change / bank select sender",
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
          "text": "PROGRAM",
          "textcolor": [
            0.4392,
            0.4784,
            0.5412,
            1.0
          ],
          "fontname": "Arial",
          "fontsize": 8.0,
          "fontface": 1,
          "textjustification": 0,
          "presentation": 1,
          "presentation_rect": [
            16.0,
            12.0,
            120.0,
            12.0
          ],
          "patching_rect": [
            816.0,
            32.0,
            120.0,
            12.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-8",
          "maxclass": "comment",
          "text": "PC-CONTROL",
          "textcolor": [
            0.4392,
            0.4784,
            0.5412,
            1.0
          ],
          "fontname": "Arial",
          "fontsize": 7.0,
          "fontface": 0,
          "textjustification": 2,
          "presentation": 1,
          "presentation_rect": [
            122.0,
            12.0,
            54.0,
            12.0
          ],
          "patching_rect": [
            922.0,
            32.0,
            54.0,
            12.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-9",
          "maxclass": "comment",
          "text": "1",
          "textcolor": [
            0.1804,
            0.902,
            0.7843,
            1.0
          ],
          "fontname": "Menlo",
          "fontsize": 44.0,
          "fontface": 1,
          "textjustification": 1,
          "presentation": 1,
          "presentation_rect": [
            14.0,
            24.0,
            164.0,
            56.0
          ],
          "patching_rect": [
            814.0,
            44.0,
            164.0,
            56.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-10",
          "maxclass": "comment",
          "text": "preset number  (PC value = n - 1)",
          "textcolor": [
            0.4392,
            0.4784,
            0.5412,
            1.0
          ],
          "fontname": "Arial",
          "fontsize": 7.0,
          "fontface": 0,
          "textjustification": 1,
          "presentation": 1,
          "presentation_rect": [
            16.0,
            80.0,
            160.0,
            12.0
          ],
          "patching_rect": [
            816.0,
            100.0,
            160.0,
            12.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-11",
          "maxclass": "live.dial",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "float"
          ],
          "parameter_enable": 1,
          "patching_rect": [
            30.0,
            108.0,
            44.0,
            48.0
          ],
          "presentation": 1,
          "presentation_rect": [
            196.0,
            8.0,
            44.0,
            48.0
          ],
          "varname": "Channel",
          "fontname": "Arial",
          "fontsize": 9.0,
          "fontface": 1,
          "dialcolor": [
            0.2039,
            0.2275,
            0.2745,
            1.0
          ],
          "activedialcolor": [
            0.1804,
            0.902,
            0.7843,
            1.0
          ],
          "needlecolor": [
            0.8471,
            0.8706,
            0.9098,
            1.0
          ],
          "activeneedlecolor": [
            0.8471,
            0.8706,
            0.9098,
            1.0
          ],
          "textcolor": [
            0.8471,
            0.8706,
            0.9098,
            1.0
          ],
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_initial": [
                1
              ],
              "parameter_initial_enable": 1,
              "parameter_longname": "Channel",
              "parameter_mmax": 16.0,
              "parameter_mmin": 1.0,
              "parameter_shortname": "CH",
              "parameter_type": 1,
              "parameter_unitstyle": 0
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-12",
          "maxclass": "live.dial",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "float"
          ],
          "parameter_enable": 1,
          "patching_rect": [
            30.0,
            108.0,
            44.0,
            48.0
          ],
          "presentation": 1,
          "presentation_rect": [
            250.0,
            8.0,
            44.0,
            48.0
          ],
          "varname": "BankMSB",
          "fontname": "Arial",
          "fontsize": 9.0,
          "fontface": 1,
          "dialcolor": [
            0.2039,
            0.2275,
            0.2745,
            1.0
          ],
          "activedialcolor": [
            0.1804,
            0.902,
            0.7843,
            1.0
          ],
          "needlecolor": [
            0.8471,
            0.8706,
            0.9098,
            1.0
          ],
          "activeneedlecolor": [
            0.8471,
            0.8706,
            0.9098,
            1.0
          ],
          "textcolor": [
            0.8471,
            0.8706,
            0.9098,
            1.0
          ],
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_initial": [
                0
              ],
              "parameter_initial_enable": 1,
              "parameter_longname": "Bank MSB",
              "parameter_mmax": 127.0,
              "parameter_mmin": 0.0,
              "parameter_shortname": "MSB",
              "parameter_type": 1,
              "parameter_unitstyle": 0
            }
          }
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
          "parameter_enable": 1,
          "patching_rect": [
            30.0,
            108.0,
            44.0,
            48.0
          ],
          "presentation": 1,
          "presentation_rect": [
            304.0,
            8.0,
            44.0,
            48.0
          ],
          "varname": "BankLSB",
          "fontname": "Arial",
          "fontsize": 9.0,
          "fontface": 1,
          "dialcolor": [
            0.2039,
            0.2275,
            0.2745,
            1.0
          ],
          "activedialcolor": [
            0.1804,
            0.902,
            0.7843,
            1.0
          ],
          "needlecolor": [
            0.8471,
            0.8706,
            0.9098,
            1.0
          ],
          "activeneedlecolor": [
            0.8471,
            0.8706,
            0.9098,
            1.0
          ],
          "textcolor": [
            0.8471,
            0.8706,
            0.9098,
            1.0
          ],
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_initial": [
                0
              ],
              "parameter_initial_enable": 1,
              "parameter_longname": "Bank LSB",
              "parameter_mmax": 127.0,
              "parameter_mmin": 0.0,
              "parameter_shortname": "LSB",
              "parameter_type": 1,
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
          "parameter_enable": 1,
          "patching_rect": [
            30.0,
            108.0,
            44.0,
            48.0
          ],
          "presentation": 1,
          "presentation_rect": [
            358.0,
            8.0,
            44.0,
            48.0
          ],
          "varname": "CCNumber",
          "fontname": "Arial",
          "fontsize": 9.0,
          "fontface": 1,
          "dialcolor": [
            0.2039,
            0.2275,
            0.2745,
            1.0
          ],
          "activedialcolor": [
            0.1804,
            0.902,
            0.7843,
            1.0
          ],
          "needlecolor": [
            0.8471,
            0.8706,
            0.9098,
            1.0
          ],
          "activeneedlecolor": [
            0.8471,
            0.8706,
            0.9098,
            1.0
          ],
          "textcolor": [
            0.8471,
            0.8706,
            0.9098,
            1.0
          ],
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_initial": [
                0
              ],
              "parameter_initial_enable": 1,
              "parameter_longname": "CC Number",
              "parameter_mmax": 127.0,
              "parameter_mmin": 0.0,
              "parameter_shortname": "CC#",
              "parameter_type": 1,
              "parameter_unitstyle": 0
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-15",
          "maxclass": "live.toggle",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "parameter_enable": 1,
          "patching_rect": [
            30.0,
            108.0,
            14.0,
            14.0
          ],
          "presentation": 1,
          "presentation_rect": [
            414.0,
            12.0,
            14.0,
            14.0
          ],
          "varname": "AutoSend",
          "activecolor": [
            0.1804,
            0.902,
            0.7843,
            1.0
          ],
          "bgcolor": [
            0.1569,
            0.1765,
            0.2157,
            1.0
          ],
          "bordercolor": [
            0.2431,
            0.2667,
            0.3216,
            1.0
          ],
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_enum": [
                "off",
                "on"
              ],
              "parameter_initial": [
                0
              ],
              "parameter_initial_enable": 1,
              "parameter_longname": "Auto Send",
              "parameter_mmax": 1,
              "parameter_shortname": "Auto",
              "parameter_type": 2
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-16",
          "maxclass": "comment",
          "text": "AUTO",
          "textcolor": [
            0.4392,
            0.4784,
            0.5412,
            1.0
          ],
          "fontname": "Arial",
          "fontsize": 8.0,
          "fontface": 1,
          "textjustification": 0,
          "presentation": 1,
          "presentation_rect": [
            434.0,
            11.0,
            60.0,
            14.0
          ],
          "patching_rect": [
            1234.0,
            31.0,
            60.0,
            14.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-17",
          "maxclass": "live.toggle",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "parameter_enable": 1,
          "patching_rect": [
            30.0,
            108.0,
            14.0,
            14.0
          ],
          "presentation": 1,
          "presentation_rect": [
            414.0,
            34.0,
            14.0,
            14.0
          ],
          "varname": "SendBank",
          "activecolor": [
            0.1804,
            0.902,
            0.7843,
            1.0
          ],
          "bgcolor": [
            0.1569,
            0.1765,
            0.2157,
            1.0
          ],
          "bordercolor": [
            0.2431,
            0.2667,
            0.3216,
            1.0
          ],
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_enum": [
                "off",
                "on"
              ],
              "parameter_initial": [
                0
              ],
              "parameter_initial_enable": 1,
              "parameter_longname": "Send Bank",
              "parameter_mmax": 1,
              "parameter_shortname": "Bank",
              "parameter_type": 2
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-18",
          "maxclass": "comment",
          "text": "BANK",
          "textcolor": [
            0.4392,
            0.4784,
            0.5412,
            1.0
          ],
          "fontname": "Arial",
          "fontsize": 8.0,
          "fontface": 1,
          "textjustification": 0,
          "presentation": 1,
          "presentation_rect": [
            434.0,
            33.0,
            60.0,
            14.0
          ],
          "patching_rect": [
            1234.0,
            53.0,
            60.0,
            14.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-19",
          "maxclass": "live.toggle",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "parameter_enable": 1,
          "patching_rect": [
            30.0,
            108.0,
            14.0,
            14.0
          ],
          "presentation": 1,
          "presentation_rect": [
            414.0,
            56.0,
            14.0,
            14.0
          ],
          "varname": "CCMode",
          "activecolor": [
            0.1804,
            0.902,
            0.7843,
            1.0
          ],
          "bgcolor": [
            0.1569,
            0.1765,
            0.2157,
            1.0
          ],
          "bordercolor": [
            0.2431,
            0.2667,
            0.3216,
            1.0
          ],
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_enum": [
                "off",
                "on"
              ],
              "parameter_initial": [
                0
              ],
              "parameter_initial_enable": 1,
              "parameter_longname": "CC Mode",
              "parameter_mmax": 1,
              "parameter_shortname": "CCmode",
              "parameter_type": 2
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-20",
          "maxclass": "comment",
          "text": "CC MODE",
          "textcolor": [
            0.4392,
            0.4784,
            0.5412,
            1.0
          ],
          "fontname": "Arial",
          "fontsize": 8.0,
          "fontface": 1,
          "textjustification": 0,
          "presentation": 1,
          "presentation_rect": [
            434.0,
            55.0,
            60.0,
            14.0
          ],
          "patching_rect": [
            1234.0,
            75.0,
            60.0,
            14.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-21",
          "maxclass": "live.toggle",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "parameter_enable": 1,
          "patching_rect": [
            30.0,
            108.0,
            14.0,
            14.0
          ],
          "presentation": 1,
          "presentation_rect": [
            414.0,
            78.0,
            14.0,
            14.0
          ],
          "varname": "SendOnLoad",
          "activecolor": [
            0.1804,
            0.902,
            0.7843,
            1.0
          ],
          "bgcolor": [
            0.1569,
            0.1765,
            0.2157,
            1.0
          ],
          "bordercolor": [
            0.2431,
            0.2667,
            0.3216,
            1.0
          ],
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_enum": [
                "off",
                "on"
              ],
              "parameter_initial": [
                0
              ],
              "parameter_initial_enable": 1,
              "parameter_longname": "Send On Load",
              "parameter_mmax": 1,
              "parameter_shortname": "OnLoad",
              "parameter_type": 2
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-22",
          "maxclass": "comment",
          "text": "ON LOAD",
          "textcolor": [
            0.4392,
            0.4784,
            0.5412,
            1.0
          ],
          "fontname": "Arial",
          "fontsize": 8.0,
          "fontface": 1,
          "textjustification": 0,
          "presentation": 1,
          "presentation_rect": [
            434.0,
            77.0,
            60.0,
            14.0
          ],
          "patching_rect": [
            1234.0,
            97.0,
            60.0,
            14.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-23",
          "maxclass": "live.dial",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "float"
          ],
          "parameter_enable": 1,
          "patching_rect": [
            30.0,
            108.0,
            44.0,
            48.0
          ],
          "presentation": 1,
          "presentation_rect": [
            8.0,
            104.0,
            58.0,
            56.0
          ],
          "varname": "Program",
          "fontname": "Arial",
          "fontsize": 9.0,
          "fontface": 1,
          "dialcolor": [
            0.2039,
            0.2275,
            0.2745,
            1.0
          ],
          "activedialcolor": [
            0.1804,
            0.902,
            0.7843,
            1.0
          ],
          "needlecolor": [
            0.8471,
            0.8706,
            0.9098,
            1.0
          ],
          "activeneedlecolor": [
            0.8471,
            0.8706,
            0.9098,
            1.0
          ],
          "textcolor": [
            0.8471,
            0.8706,
            0.9098,
            1.0
          ],
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_initial": [
                0
              ],
              "parameter_initial_enable": 1,
              "parameter_longname": "Program",
              "parameter_mmax": 127.0,
              "parameter_mmin": 0.0,
              "parameter_shortname": "PRG",
              "parameter_type": 1,
              "parameter_unitstyle": 0
            }
          }
        }
      },
      {
        "box": {
          "id": "obj-24",
          "maxclass": "textbutton",
          "text": "<",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "",
            "",
            "int"
          ],
          "patching_rect": [
            30.0,
            108.0,
            60.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            76.0,
            112.0,
            38.0,
            38.0
          ],
          "mode": 0,
          "fontname": "Arial",
          "fontsize": 9.0,
          "fontface": 1,
          "bgcolor": [
            0.1451,
            0.1608,
            0.1961,
            1.0
          ],
          "bgoncolor": [
            0.2745,
            0.302,
            0.3686,
            1.0
          ],
          "bordercolor": [
            0.2431,
            0.2667,
            0.3216,
            1.0
          ],
          "textcolor": [
            0.8471,
            0.8706,
            0.9098,
            1.0
          ],
          "textoncolor": [
            1.0,
            1.0,
            1.0,
            1.0
          ],
          "usebgoncolor": 1,
          "rounded": 6.0
        }
      },
      {
        "box": {
          "id": "obj-25",
          "maxclass": "textbutton",
          "text": ">",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "",
            "",
            "int"
          ],
          "patching_rect": [
            30.0,
            108.0,
            60.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            118.0,
            112.0,
            38.0,
            38.0
          ],
          "mode": 0,
          "fontname": "Arial",
          "fontsize": 9.0,
          "fontface": 1,
          "bgcolor": [
            0.1451,
            0.1608,
            0.1961,
            1.0
          ],
          "bgoncolor": [
            0.2745,
            0.302,
            0.3686,
            1.0
          ],
          "bordercolor": [
            0.2431,
            0.2667,
            0.3216,
            1.0
          ],
          "textcolor": [
            0.8471,
            0.8706,
            0.9098,
            1.0
          ],
          "textoncolor": [
            1.0,
            1.0,
            1.0,
            1.0
          ],
          "usebgoncolor": 1,
          "rounded": 6.0
        }
      },
      {
        "box": {
          "id": "obj-26",
          "maxclass": "textbutton",
          "text": "SEND",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "",
            "",
            "int"
          ],
          "patching_rect": [
            30.0,
            108.0,
            60.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            164.0,
            112.0,
            70.0,
            38.0
          ],
          "mode": 0,
          "fontname": "Arial",
          "fontsize": 9.0,
          "fontface": 1,
          "bgcolor": [
            0.1804,
            0.902,
            0.7843,
            1.0
          ],
          "bgoncolor": [
            0.4706,
            1.0,
            0.9216,
            1.0
          ],
          "bordercolor": [
            0.1804,
            0.902,
            0.7843,
            1.0
          ],
          "textcolor": [
            0.0392,
            0.1569,
            0.1412,
            1.0
          ],
          "textoncolor": [
            0.0,
            0.0,
            0.0,
            1.0
          ],
          "usebgoncolor": 1,
          "rounded": 6.0
        }
      },
      {
        "box": {
          "id": "obj-27",
          "maxclass": "comment",
          "text": "DEVICE PROFILES  (starting points, adjust to taste)",
          "textcolor": [
            0.4392,
            0.4784,
            0.5412,
            1.0
          ],
          "fontname": "Arial",
          "fontsize": 7.0,
          "fontface": 1,
          "textjustification": 0,
          "presentation": 1,
          "presentation_rect": [
            244.0,
            100.0,
            226.0,
            12.0
          ],
          "patching_rect": [
            1044.0,
            120.0,
            226.0,
            12.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-28",
          "maxclass": "textbutton",
          "text": "PRO 800",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "",
            "",
            "int"
          ],
          "patching_rect": [
            30.0,
            108.0,
            60.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            244.0,
            114.0,
            72.0,
            36.0
          ],
          "mode": 0,
          "fontname": "Arial",
          "fontsize": 9.0,
          "fontface": 1,
          "bgcolor": [
            0.1451,
            0.1608,
            0.1961,
            1.0
          ],
          "bgoncolor": [
            0.2745,
            0.302,
            0.3686,
            1.0
          ],
          "bordercolor": [
            0.2431,
            0.2667,
            0.3216,
            1.0
          ],
          "textcolor": [
            0.8471,
            0.8706,
            0.9098,
            1.0
          ],
          "textoncolor": [
            1.0,
            1.0,
            1.0,
            1.0
          ],
          "usebgoncolor": 1,
          "rounded": 6.0
        }
      },
      {
        "box": {
          "id": "obj-29",
          "maxclass": "textbutton",
          "text": "MICROFREAK",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "",
            "",
            "int"
          ],
          "patching_rect": [
            30.0,
            108.0,
            60.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            320.0,
            114.0,
            72.0,
            36.0
          ],
          "mode": 0,
          "fontname": "Arial",
          "fontsize": 9.0,
          "fontface": 1,
          "bgcolor": [
            0.1451,
            0.1608,
            0.1961,
            1.0
          ],
          "bgoncolor": [
            0.2745,
            0.302,
            0.3686,
            1.0
          ],
          "bordercolor": [
            0.2431,
            0.2667,
            0.3216,
            1.0
          ],
          "textcolor": [
            0.8471,
            0.8706,
            0.9098,
            1.0
          ],
          "textoncolor": [
            1.0,
            1.0,
            1.0,
            1.0
          ],
          "usebgoncolor": 1,
          "rounded": 6.0
        }
      },
      {
        "box": {
          "id": "obj-30",
          "maxclass": "textbutton",
          "text": "FM-1",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "",
            "",
            "int"
          ],
          "patching_rect": [
            30.0,
            108.0,
            60.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            396.0,
            114.0,
            72.0,
            36.0
          ],
          "mode": 0,
          "fontname": "Arial",
          "fontsize": 9.0,
          "fontface": 1,
          "bgcolor": [
            0.1451,
            0.1608,
            0.1961,
            1.0
          ],
          "bgoncolor": [
            0.2745,
            0.302,
            0.3686,
            1.0
          ],
          "bordercolor": [
            0.2431,
            0.2667,
            0.3216,
            1.0
          ],
          "textcolor": [
            0.8471,
            0.8706,
            0.9098,
            1.0
          ],
          "textoncolor": [
            1.0,
            1.0,
            1.0,
            1.0
          ],
          "usebgoncolor": 1,
          "rounded": 6.0
        }
      },
      {
        "box": {
          "id": "obj-31",
          "maxclass": "newobj",
          "text": "pak 0 1 0 0 0 0",
          "numinlets": 6,
          "numoutlets": 1,
          "outlettype": [
            ""
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
          "id": "obj-32",
          "maxclass": "newobj",
          "text": "unpack 0 0 0 0 0 0",
          "numinlets": 1,
          "numoutlets": 6,
          "outlettype": [
            "int",
            "int",
            "int",
            "int",
            "int",
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
          "id": "obj-33",
          "maxclass": "newobj",
          "text": "t i i i i",
          "numinlets": 1,
          "numoutlets": 4,
          "outlettype": [
            "int",
            "int",
            "int",
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
          "id": "obj-34",
          "maxclass": "newobj",
          "text": "pak 0 0 0",
          "numinlets": 3,
          "numoutlets": 1,
          "outlettype": [
            ""
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
          "id": "obj-35",
          "maxclass": "newobj",
          "text": "pak 0 32 0",
          "numinlets": 3,
          "numoutlets": 1,
          "outlettype": [
            ""
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
          "id": "obj-36",
          "maxclass": "newobj",
          "text": "pak 0 0 0",
          "numinlets": 3,
          "numoutlets": 1,
          "outlettype": [
            ""
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
          "id": "obj-37",
          "maxclass": "newobj",
          "text": "pak 0 0",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
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
          "id": "obj-38",
          "maxclass": "newobj",
          "text": "expr 175+$i1",
          "numinlets": 1,
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
          "id": "obj-39",
          "maxclass": "newobj",
          "text": "expr 175+$i1",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
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
          "id": "obj-40",
          "maxclass": "newobj",
          "text": "expr 175+$i1",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
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
          "id": "obj-41",
          "maxclass": "newobj",
          "text": "expr 191+$i1",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
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
          "id": "obj-42",
          "maxclass": "newobj",
          "text": "spigot",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
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
          "id": "obj-43",
          "maxclass": "newobj",
          "text": "spigot 1",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
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
          "id": "obj-44",
          "maxclass": "newobj",
          "text": "spigot",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
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
          "id": "obj-45",
          "maxclass": "newobj",
          "text": "== 0",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
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
          "id": "obj-46",
          "maxclass": "newobj",
          "text": "spigot",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
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
          "id": "obj-47",
          "maxclass": "newobj",
          "text": "live.thisdevice",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "bang",
            "int",
            "int"
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
          "id": "obj-48",
          "maxclass": "newobj",
          "text": "delay 300",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            "bang"
          ],
          "patching_rect": [
            190.0,
            56.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-49",
          "maxclass": "newobj",
          "text": "spigot",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            190.0,
            82.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-50",
          "maxclass": "newobj",
          "text": "t b i",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "bang",
            "int"
          ],
          "patching_rect": [
            190.0,
            108.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-51",
          "maxclass": "newobj",
          "text": "t b i",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "bang",
            "int"
          ],
          "patching_rect": [
            190.0,
            134.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-52",
          "maxclass": "newobj",
          "text": "t b i",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "bang",
            "int"
          ],
          "patching_rect": [
            190.0,
            160.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-53",
          "maxclass": "newobj",
          "text": "t b i",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "bang",
            "int"
          ],
          "patching_rect": [
            190.0,
            186.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-54",
          "maxclass": "newobj",
          "text": "t b i i i",
          "numinlets": 1,
          "numoutlets": 4,
          "outlettype": [
            "bang",
            "int",
            "int",
            "int"
          ],
          "patching_rect": [
            190.0,
            212.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-55",
          "maxclass": "newobj",
          "text": "expr $i1+1",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            190.0,
            238.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-56",
          "maxclass": "newobj",
          "text": "prepend set",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            190.0,
            264.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-57",
          "maxclass": "newobj",
          "text": "i",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            190.0,
            290.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-58",
          "maxclass": "newobj",
          "text": "expr ($i1+127)%128",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            190.0,
            316.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-59",
          "maxclass": "newobj",
          "text": "i",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            190.0,
            342.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-60",
          "maxclass": "newobj",
          "text": "expr ($i1+1)%128",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            190.0,
            368.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-61",
          "maxclass": "newobj",
          "text": "unpack 0 0 0 0 0 0",
          "numinlets": 1,
          "numoutlets": 6,
          "outlettype": [
            "int",
            "int",
            "int",
            "int",
            "int",
            "int"
          ],
          "patching_rect": [
            190.0,
            394.0,
            120.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-62",
          "maxclass": "message",
          "text": "1 0 0 0 0 0",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            320.0,
            394.0,
            100.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-63",
          "maxclass": "message",
          "text": "1 1 0 0 0 0",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            320.0,
            420.0,
            100.0,
            22.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-64",
          "maxclass": "message",
          "text": "1 0 0 0 0 0",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            320.0,
            446.0,
            100.0,
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
            0.1804,
            0.902,
            0.7843,
            1.0
          ],
          "border": 0,
          "rounded": 0.0,
          "mode": 0,
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            808.0,
            114.0,
            176.0,
            2.0
          ],
          "presentation": 1,
          "presentation_rect": [
            8.0,
            94.0,
            176.0,
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
            0.0314,
            0.0392,
            0.051,
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
            176.0,
            90.0
          ],
          "presentation": 1,
          "presentation_rect": [
            8.0,
            8.0,
            176.0,
            90.0
          ],
          "bordercolor": [
            0.1686,
            0.1882,
            0.2235,
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
            0.0667,
            0.0745,
            0.0902,
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
            0.1804,
            0.2,
            0.2392,
            1.0
          ],
          "grad1": [
            0.1176,
            0.1294,
            0.1569,
            1.0
          ],
          "grad2": [
            0.0667,
            0.0745,
            0.0902,
            1.0
          ],
          "proportion": 0.5,
          "bgfillcolor": {
            "angle": 270.0,
            "autogradient": 0,
            "color": [
              0.0667,
              0.0745,
              0.0902,
              1.0
            ],
            "color1": [
              0.1176,
              0.1294,
              0.1569,
              1.0
            ],
            "color2": [
              0.0667,
              0.0745,
              0.0902,
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
            "obj-32",
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
            "obj-33",
            0
          ],
          "source": [
            "obj-32",
            1
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-34",
            2
          ],
          "source": [
            "obj-32",
            2
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-35",
            2
          ],
          "source": [
            "obj-32",
            3
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-36",
            1
          ],
          "source": [
            "obj-32",
            4
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-36",
            2
          ],
          "source": [
            "obj-32",
            5
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-37",
            1
          ],
          "source": [
            "obj-32",
            5
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
            "obj-33",
            3
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
            "obj-33",
            2
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
            "obj-39",
            0
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
            "obj-33",
            1
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
            "obj-40",
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
            "obj-33",
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
            "obj-41",
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
            "obj-34",
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
            "obj-35",
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
            "obj-37",
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
            "obj-36",
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
            "obj-42",
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
            "obj-43",
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
            "obj-44",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-42",
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
            "obj-44",
            1
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
            "obj-45",
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
            "obj-43",
            1
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
            "obj-46",
            1
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
            "obj-31",
            0
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
            "obj-31",
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
            "obj-48",
            0
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
            "obj-49",
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
            1
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
            "obj-31",
            0
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
            "obj-50",
            0
          ],
          "source": [
            "obj-11",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-31",
            1
          ],
          "source": [
            "obj-50",
            1
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
            "obj-12",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-31",
            2
          ],
          "source": [
            "obj-51",
            1
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
            "obj-13",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-31",
            3
          ],
          "source": [
            "obj-52",
            1
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
            "obj-52",
            0
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
            "obj-14",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-31",
            4
          ],
          "source": [
            "obj-53",
            1
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
            "obj-53",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-54",
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
            "obj-55",
            0
          ],
          "source": [
            "obj-54",
            2
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-56",
            0
          ],
          "source": [
            "obj-55",
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
            "obj-56",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-31",
            5
          ],
          "source": [
            "obj-54",
            1
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
            "obj-54",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-57",
            1
          ],
          "source": [
            "obj-54",
            3
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-57",
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
            "obj-58",
            0
          ],
          "source": [
            "obj-57",
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
            "obj-58",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-59",
            1
          ],
          "source": [
            "obj-54",
            3
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-59",
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
            "obj-60",
            0
          ],
          "source": [
            "obj-59",
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
            "obj-60",
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
            "obj-61",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-17",
            0
          ],
          "source": [
            "obj-61",
            1
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-12",
            0
          ],
          "source": [
            "obj-61",
            2
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-13",
            0
          ],
          "source": [
            "obj-61",
            3
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-19",
            0
          ],
          "source": [
            "obj-61",
            4
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-14",
            0
          ],
          "source": [
            "obj-61",
            5
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-62",
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
            "obj-61",
            0
          ],
          "source": [
            "obj-62",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-63",
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
            "obj-61",
            0
          ],
          "source": [
            "obj-63",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-64",
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
            "obj-61",
            0
          ],
          "source": [
            "obj-64",
            0
          ]
        }
      }
    ]
  }
}
