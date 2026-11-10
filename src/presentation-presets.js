// Generated from config/battle-presentation.json by tools/build-battle-presentation.mjs.
export const defaultPresentation = {
  "version": 1,
  "profiles": {
    "swing": {
      "name": "振り抜き",
      "priority": 10,
      "cooldownMs": 0,
      "variation": {
        "cents": 18,
        "gain": 0.04
      },
      "voices": [
        {
          "wave": "noise",
          "atMs": 0,
          "durationMs": 90,
          "gain": 0.035,
          "pitch": [
            {
              "at": 0,
              "value": 1900
            },
            {
              "at": 1,
              "value": 1900,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.044444444444444446,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ],
          "filter": {
            "type": "bandpass",
            "frequency": 1900,
            "q": 0.65
          }
        }
      ]
    },
    "bow": {
      "name": "弓の射出",
      "priority": 40,
      "cooldownMs": 0,
      "variation": {
        "cents": 18,
        "gain": 0.04
      },
      "voices": [
        {
          "wave": "triangle",
          "atMs": 0,
          "durationMs": 90,
          "gain": 0.055,
          "pitch": [
            {
              "at": 0,
              "value": 310
            },
            {
              "at": 1,
              "value": 120,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.044444444444444446,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ]
        }
      ]
    },
    "slash": {
      "name": "斬撃",
      "priority": 40,
      "cooldownMs": 0,
      "variation": {
        "cents": 18,
        "gain": 0.04
      },
      "voices": [
        {
          "wave": "noise",
          "atMs": 0,
          "durationMs": 75,
          "gain": 0.1,
          "pitch": [
            {
              "at": 0,
              "value": 3200
            },
            {
              "at": 1,
              "value": 3200,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.05333333333333334,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ],
          "filter": {
            "type": "bandpass",
            "frequency": 3200,
            "q": 0.65
          }
        },
        {
          "wave": "sine",
          "atMs": 0,
          "durationMs": 130,
          "gain": 0.075,
          "pitch": [
            {
              "at": 0,
              "value": 170
            },
            {
              "at": 1,
              "value": 65,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.030769230769230767,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ]
        }
      ],
      "variants": [
        [
          {
            "wave": "noise",
            "atMs": 0,
            "durationMs": 75,
            "gain": 0.095,
            "pitch": [
              {
                "at": 0,
                "value": 3200
              },
              {
                "at": 1,
                "value": 3200,
                "curve": "exponential"
              }
            ],
            "envelope": [
              {
                "at": 0,
                "value": 0
              },
              {
                "at": 0.05333333333333334,
                "value": 1
              },
              {
                "at": 1,
                "value": 0,
                "curve": "exponential"
              }
            ],
            "filter": {
              "type": "bandpass",
              "frequency": 3200,
              "q": 0.65
            }
          },
          {
            "wave": "sine",
            "atMs": 0,
            "durationMs": 130,
            "gain": 0.07125,
            "pitch": [
              {
                "at": 0,
                "value": 170
              },
              {
                "at": 1,
                "value": 65,
                "curve": "exponential"
              }
            ],
            "envelope": [
              {
                "at": 0,
                "value": 0
              },
              {
                "at": 0.030769230769230767,
                "value": 1
              },
              {
                "at": 1,
                "value": 0,
                "curve": "exponential"
              }
            ]
          }
        ]
      ]
    },
    "pierce": {
      "name": "刺突",
      "priority": 40,
      "cooldownMs": 0,
      "variation": {
        "cents": 18,
        "gain": 0.04
      },
      "voices": [
        {
          "wave": "noise",
          "atMs": 0,
          "durationMs": 55,
          "gain": 0.085,
          "pitch": [
            {
              "at": 0,
              "value": 4700
            },
            {
              "at": 1,
              "value": 4700,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.07272727272727272,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ],
          "filter": {
            "type": "bandpass",
            "frequency": 4700,
            "q": 0.65
          }
        },
        {
          "wave": "triangle",
          "atMs": 0,
          "durationMs": 100,
          "gain": 0.055,
          "pitch": [
            {
              "at": 0,
              "value": 980
            },
            {
              "at": 1,
              "value": 350,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.04,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ]
        }
      ]
    },
    "heavy": {
      "name": "打撃",
      "priority": 70,
      "cooldownMs": 0,
      "variation": {
        "cents": 18,
        "gain": 0.04
      },
      "voices": [
        {
          "wave": "sine",
          "atMs": 0,
          "durationMs": 240,
          "gain": 0.16,
          "pitch": [
            {
              "at": 0,
              "value": 135
            },
            {
              "at": 1,
              "value": 42,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.016666666666666666,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ]
        },
        {
          "wave": "noise",
          "atMs": 0,
          "durationMs": 130,
          "gain": 0.1,
          "pitch": [
            {
              "at": 0,
              "value": 850
            },
            {
              "at": 1,
              "value": 850,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.030769230769230767,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ],
          "filter": {
            "type": "bandpass",
            "frequency": 850,
            "q": 0.65
          }
        },
        {
          "wave": "sine",
          "atMs": 35,
          "durationMs": 200,
          "gain": 0.055,
          "pitch": [
            {
              "at": 0,
              "value": 68
            },
            {
              "at": 1,
              "value": 38,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.02,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ]
        }
      ]
    },
    "critical": {
      "name": "会心",
      "priority": 80,
      "cooldownMs": 0,
      "variation": {
        "cents": 18,
        "gain": 0.04
      },
      "voices": [
        {
          "wave": "noise",
          "atMs": 0,
          "durationMs": 90,
          "gain": 0.13,
          "pitch": [
            {
              "at": 0,
              "value": 3900
            },
            {
              "at": 1,
              "value": 3900,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.044444444444444446,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ],
          "filter": {
            "type": "bandpass",
            "frequency": 3900,
            "q": 0.65
          }
        },
        {
          "wave": "sine",
          "atMs": 0,
          "durationMs": 240,
          "gain": 0.14,
          "pitch": [
            {
              "at": 0,
              "value": 190
            },
            {
              "at": 1,
              "value": 48,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.016666666666666666,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ],
          "distortion": 0.6
        },
        {
          "wave": "triangle",
          "atMs": 15,
          "durationMs": 170,
          "gain": 0.045,
          "pitch": [
            {
              "at": 0,
              "value": 1760
            },
            {
              "at": 1,
              "value": 880,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.023529411764705882,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ]
        }
      ]
    },
    "guard": {
      "name": "防御",
      "priority": 40,
      "cooldownMs": 0,
      "variation": {
        "cents": 18,
        "gain": 0.04
      },
      "voices": [
        {
          "wave": "triangle",
          "atMs": 0,
          "durationMs": 160,
          "gain": 0.07,
          "pitch": [
            {
              "at": 0,
              "value": 880
            },
            {
              "at": 1,
              "value": 820,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.025,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ]
        },
        {
          "wave": "sine",
          "atMs": 0,
          "durationMs": 130,
          "gain": 0.035,
          "pitch": [
            {
              "at": 0,
              "value": 1320
            },
            {
              "at": 1,
              "value": 1220,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.030769230769230767,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ]
        },
        {
          "wave": "noise",
          "atMs": 0,
          "durationMs": 35,
          "gain": 0.045,
          "pitch": [
            {
              "at": 0,
              "value": 4800
            },
            {
              "at": 1,
              "value": 4800,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.11428571428571428,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ],
          "filter": {
            "type": "bandpass",
            "frequency": 4800,
            "q": 0.65
          }
        }
      ]
    },
    "heal": {
      "name": "回復",
      "priority": 40,
      "cooldownMs": 0,
      "variation": {
        "cents": 0,
        "gain": 0.04
      },
      "voices": [
        {
          "wave": "sine",
          "atMs": 0,
          "durationMs": 220,
          "gain": 0.045,
          "pitch": [
            {
              "at": 0,
              "value": 660
            },
            {
              "at": 1,
              "value": 660,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.01818181818181818,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ]
        },
        {
          "wave": "sine",
          "atMs": 55,
          "durationMs": 220,
          "gain": 0.04,
          "pitch": [
            {
              "at": 0,
              "value": 880
            },
            {
              "at": 1,
              "value": 880,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.01818181818181818,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ]
        },
        {
          "wave": "sine",
          "atMs": 110,
          "durationMs": 260,
          "gain": 0.035,
          "pitch": [
            {
              "at": 0,
              "value": 1320
            },
            {
              "at": 1,
              "value": 1320,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.015384615384615384,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ],
          "reverb": {
            "durationMs": 300,
            "mix": 0.14
          }
        }
      ]
    },
    "fire": {
      "name": "炎",
      "priority": 40,
      "cooldownMs": 0,
      "variation": {
        "cents": 18,
        "gain": 0.04
      },
      "voices": [
        {
          "wave": "noise",
          "atMs": 0,
          "durationMs": 240,
          "gain": 0.13,
          "pitch": [
            {
              "at": 0,
              "value": 650
            },
            {
              "at": 1,
              "value": 650,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.016666666666666666,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ],
          "filter": {
            "type": "bandpass",
            "frequency": 650,
            "q": 0.65
          }
        },
        {
          "wave": "sine",
          "atMs": 0,
          "durationMs": 240,
          "gain": 0.09,
          "pitch": [
            {
              "at": 0,
              "value": 115
            },
            {
              "at": 1,
              "value": 40,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.016666666666666666,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ]
        }
      ]
    },
    "ice": {
      "name": "氷",
      "priority": 40,
      "cooldownMs": 0,
      "variation": {
        "cents": 18,
        "gain": 0.04
      },
      "voices": [
        {
          "wave": "triangle",
          "atMs": 0,
          "durationMs": 180,
          "gain": 0.055,
          "pitch": [
            {
              "at": 0,
              "value": 1480
            },
            {
              "at": 1,
              "value": 720,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.022222222222222223,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ]
        },
        {
          "wave": "sine",
          "atMs": 25,
          "durationMs": 150,
          "gain": 0.035,
          "pitch": [
            {
              "at": 0,
              "value": 2220
            },
            {
              "at": 1,
              "value": 1100,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.02666666666666667,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ]
        },
        {
          "wave": "noise",
          "atMs": 0,
          "durationMs": 70,
          "gain": 0.06,
          "pitch": [
            {
              "at": 0,
              "value": 5900
            },
            {
              "at": 1,
              "value": 5900,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.05714285714285714,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ],
          "filter": {
            "type": "bandpass",
            "frequency": 5900,
            "q": 0.65
          }
        }
      ]
    },
    "lightning": {
      "name": "雷",
      "priority": 40,
      "cooldownMs": 0,
      "variation": {
        "cents": 18,
        "gain": 0.04
      },
      "voices": [
        {
          "wave": "noise",
          "atMs": 0,
          "durationMs": 55,
          "gain": 0.11,
          "pitch": [
            {
              "at": 0,
              "value": 4200
            },
            {
              "at": 1,
              "value": 4200,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.07272727272727272,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ],
          "filter": {
            "type": "bandpass",
            "frequency": 4200,
            "q": 0.65
          }
        },
        {
          "wave": "sine",
          "atMs": 0,
          "durationMs": 160,
          "gain": 0.09,
          "pitch": [
            {
              "at": 0,
              "value": 110
            },
            {
              "at": 1,
              "value": 45,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.025,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ]
        },
        {
          "wave": "noise",
          "atMs": 45,
          "durationMs": 45,
          "gain": 0.055,
          "pitch": [
            {
              "at": 0,
              "value": 3200
            },
            {
              "at": 1,
              "value": 3200,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.08888888888888889,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ],
          "filter": {
            "type": "bandpass",
            "frequency": 3200,
            "q": 0.65
          }
        }
      ]
    },
    "defeat": {
      "name": "撃破",
      "priority": 80,
      "cooldownMs": 0,
      "variation": {
        "cents": 18,
        "gain": 0.04
      },
      "voices": [
        {
          "wave": "noise",
          "atMs": 0,
          "durationMs": 320,
          "gain": 0.065,
          "pitch": [
            {
              "at": 0,
              "value": 650
            },
            {
              "at": 1,
              "value": 650,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.0125,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ],
          "filter": {
            "type": "bandpass",
            "frequency": 650,
            "q": 0.65
          }
        },
        {
          "wave": "sine",
          "atMs": 0,
          "durationMs": 320,
          "gain": 0.08,
          "pitch": [
            {
              "at": 0,
              "value": 100
            },
            {
              "at": 1,
              "value": 28,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.0125,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ]
        }
      ]
    },
    "material_flesh": {
      "name": "肉体",
      "priority": 25,
      "cooldownMs": 35,
      "variation": {
        "cents": 35,
        "gain": 0.08
      },
      "voices": [
        {
          "wave": "sine",
          "atMs": 0,
          "durationMs": 100,
          "gain": 0.035,
          "pitch": [
            {
              "at": 0,
              "value": 95
            },
            {
              "at": 1,
              "value": 35,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.03,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ]
        }
      ]
    },
    "material_metal": {
      "name": "金属",
      "priority": 25,
      "cooldownMs": 35,
      "variation": {
        "cents": 35,
        "gain": 0.08
      },
      "voices": [
        {
          "wave": "triangle",
          "atMs": 0,
          "durationMs": 180,
          "gain": 0.028,
          "pitch": [
            {
              "at": 0,
              "value": 1880
            },
            {
              "at": 1,
              "value": 1240,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.03,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ]
        }
      ]
    },
    "material_shield": {
      "name": "盾",
      "priority": 25,
      "cooldownMs": 35,
      "variation": {
        "cents": 35,
        "gain": 0.08
      },
      "voices": [
        {
          "wave": "triangle",
          "atMs": 0,
          "durationMs": 160,
          "gain": 0.035,
          "pitch": [
            {
              "at": 0,
              "value": 1040
            },
            {
              "at": 1,
              "value": 880,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.03,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ]
        }
      ]
    },
    "material_stone": {
      "name": "石",
      "priority": 25,
      "cooldownMs": 35,
      "variation": {
        "cents": 35,
        "gain": 0.08
      },
      "voices": [
        {
          "wave": "noise",
          "atMs": 0,
          "durationMs": 140,
          "gain": 0.04,
          "pitch": [
            {
              "at": 0,
              "value": 950
            },
            {
              "at": 1,
              "value": 650,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.03,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ],
          "filter": {
            "type": "lowpass",
            "frequency": 1800,
            "q": 0.6
          }
        }
      ]
    },
    "material_wood": {
      "name": "木",
      "priority": 25,
      "cooldownMs": 35,
      "variation": {
        "cents": 35,
        "gain": 0.08
      },
      "voices": [
        {
          "wave": "triangle",
          "atMs": 0,
          "durationMs": 100,
          "gain": 0.035,
          "pitch": [
            {
              "at": 0,
              "value": 310
            },
            {
              "at": 1,
              "value": 95,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.03,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ]
        }
      ]
    },
    "material_water": {
      "name": "水",
      "priority": 25,
      "cooldownMs": 35,
      "variation": {
        "cents": 35,
        "gain": 0.08
      },
      "voices": [
        {
          "wave": "noise",
          "atMs": 0,
          "durationMs": 220,
          "gain": 0.035,
          "pitch": [
            {
              "at": 0,
              "value": 1700
            },
            {
              "at": 1,
              "value": 400,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.03,
              "value": 1
            },
            {
              "at": 1,
              "value": 0,
              "curve": "exponential"
            }
          ],
          "filter": {
            "type": "lowpass",
            "frequency": 1800,
            "q": 0.6
          }
        }
      ]
    },
    "charge": {
      "name": "魔力の溜め",
      "priority": 35,
      "cooldownMs": 50,
      "variation": {
        "cents": 4,
        "gain": 0.02
      },
      "voices": [
        {
          "wave": "sawtooth",
          "atMs": 0,
          "durationMs": 650,
          "gain": 0.035,
          "pitch": [
            {
              "at": 0,
              "value": 110
            },
            {
              "at": 0.7,
              "value": 440,
              "curve": "exponential"
            },
            {
              "at": 1,
              "value": 220,
              "curve": "exponential"
            }
          ],
          "envelope": [
            {
              "at": 0,
              "value": 0
            },
            {
              "at": 0.7,
              "value": 1
            },
            {
              "at": 1,
              "value": 0
            }
          ],
          "filter": {
            "type": "lowpass",
            "frequency": 700,
            "q": 1.5,
            "cutoff": [
              {
                "at": 0,
                "value": 350
              },
              {
                "at": 1,
                "value": 2200
              }
            ]
          },
          "vibrato": {
            "hz": 7,
            "cents": 25
          },
          "echo": {
            "delayMs": 100,
            "gain": 0.15,
            "taps": 2
          }
        }
      ]
    }
  },
  "particles": {
    "slash": {
      "name": "斬撃",
      "color": "#ffe4a1",
      "count": 4,
      "durationMs": 240,
      "size": 8,
      "speed": 220,
      "directionDeg": 0,
      "spreadDeg": 360,
      "gravity": 0,
      "shape": "spark",
      "scale": [
        {
          "at": 0,
          "value": 0.5
        },
        {
          "at": 0.15,
          "value": 1
        },
        {
          "at": 1,
          "value": 0.7
        }
      ],
      "alpha": [
        {
          "at": 0,
          "value": 0
        },
        {
          "at": 0.15,
          "value": 1
        },
        {
          "at": 1,
          "value": 0
        }
      ]
    },
    "pierce": {
      "name": "刺突",
      "color": "#c7eaff",
      "count": 4,
      "durationMs": 240,
      "size": 8,
      "speed": 220,
      "directionDeg": 0,
      "spreadDeg": 360,
      "gravity": 0,
      "shape": "spark",
      "scale": [
        {
          "at": 0,
          "value": 0.5
        },
        {
          "at": 0.15,
          "value": 1
        },
        {
          "at": 1,
          "value": 0.7
        }
      ],
      "alpha": [
        {
          "at": 0,
          "value": 0
        },
        {
          "at": 0.15,
          "value": 1
        },
        {
          "at": 1,
          "value": 0
        }
      ]
    },
    "heavy": {
      "name": "打撃",
      "color": "#ffc078",
      "count": 7,
      "durationMs": 240,
      "size": 8,
      "speed": 220,
      "directionDeg": 0,
      "spreadDeg": 360,
      "gravity": 0,
      "shape": "spark",
      "scale": [
        {
          "at": 0,
          "value": 0.5
        },
        {
          "at": 0.15,
          "value": 1
        },
        {
          "at": 1,
          "value": 0.7
        }
      ],
      "alpha": [
        {
          "at": 0,
          "value": 0
        },
        {
          "at": 0.15,
          "value": 1
        },
        {
          "at": 1,
          "value": 0
        }
      ],
      "ring": {
        "durationMs": 240,
        "from": 0.3,
        "to": 1.45,
        "opacity": 0.65
      }
    },
    "critical": {
      "name": "会心",
      "color": "#ffdf74",
      "count": 10,
      "durationMs": 300,
      "size": 13,
      "speed": 220,
      "directionDeg": 0,
      "spreadDeg": 360,
      "gravity": 0,
      "shape": "spark",
      "scale": [
        {
          "at": 0,
          "value": 0.5
        },
        {
          "at": 0.15,
          "value": 1
        },
        {
          "at": 1,
          "value": 0.7
        }
      ],
      "alpha": [
        {
          "at": 0,
          "value": 0
        },
        {
          "at": 0.15,
          "value": 1
        },
        {
          "at": 1,
          "value": 0
        }
      ],
      "ring": {
        "durationMs": 240,
        "from": 0.3,
        "to": 1.45,
        "opacity": 0.65
      }
    },
    "guard": {
      "name": "防御",
      "color": "#a9d9ff",
      "count": 4,
      "durationMs": 240,
      "size": 8,
      "speed": 220,
      "directionDeg": 0,
      "spreadDeg": 360,
      "gravity": 0,
      "shape": "spark",
      "scale": [
        {
          "at": 0,
          "value": 0.5
        },
        {
          "at": 0.15,
          "value": 1
        },
        {
          "at": 1,
          "value": 0.7
        }
      ],
      "alpha": [
        {
          "at": 0,
          "value": 0
        },
        {
          "at": 0.15,
          "value": 1
        },
        {
          "at": 1,
          "value": 0
        }
      ],
      "ring": {
        "durationMs": 240,
        "from": 0.3,
        "to": 1.45,
        "opacity": 0.65
      }
    },
    "heal": {
      "name": "回復",
      "color": "#9df7c2",
      "count": 8,
      "durationMs": 420,
      "size": 4,
      "speed": 100,
      "directionDeg": -90,
      "spreadDeg": 70,
      "gravity": 0,
      "shape": "circle",
      "scale": [
        {
          "at": 0,
          "value": 0.5
        },
        {
          "at": 0.15,
          "value": 1
        },
        {
          "at": 1,
          "value": 0.7
        }
      ],
      "alpha": [
        {
          "at": 0,
          "value": 0
        },
        {
          "at": 0.15,
          "value": 1
        },
        {
          "at": 1,
          "value": 0
        }
      ],
      "ring": {
        "durationMs": 300,
        "from": 0.3,
        "to": 1.45,
        "opacity": 0.65
      }
    },
    "fire": {
      "name": "炎",
      "color": "#ff945d",
      "count": 4,
      "durationMs": 240,
      "size": 8,
      "speed": 220,
      "directionDeg": 0,
      "spreadDeg": 360,
      "gravity": 0,
      "shape": "spark",
      "scale": [
        {
          "at": 0,
          "value": 0.5
        },
        {
          "at": 0.15,
          "value": 1
        },
        {
          "at": 1,
          "value": 0.7
        }
      ],
      "alpha": [
        {
          "at": 0,
          "value": 0
        },
        {
          "at": 0.15,
          "value": 1
        },
        {
          "at": 1,
          "value": 0
        }
      ]
    },
    "ice": {
      "name": "氷",
      "color": "#aeeaff",
      "count": 4,
      "durationMs": 240,
      "size": 8,
      "speed": 220,
      "directionDeg": 0,
      "spreadDeg": 360,
      "gravity": 0,
      "shape": "spark",
      "scale": [
        {
          "at": 0,
          "value": 0.5
        },
        {
          "at": 0.15,
          "value": 1
        },
        {
          "at": 1,
          "value": 0.7
        }
      ],
      "alpha": [
        {
          "at": 0,
          "value": 0
        },
        {
          "at": 0.15,
          "value": 1
        },
        {
          "at": 1,
          "value": 0
        }
      ]
    },
    "lightning": {
      "name": "雷",
      "color": "#e8ceff",
      "count": 4,
      "durationMs": 240,
      "size": 8,
      "speed": 220,
      "directionDeg": 0,
      "spreadDeg": 360,
      "gravity": 0,
      "shape": "spark",
      "scale": [
        {
          "at": 0,
          "value": 0.5
        },
        {
          "at": 0.15,
          "value": 1
        },
        {
          "at": 1,
          "value": 0.7
        }
      ],
      "alpha": [
        {
          "at": 0,
          "value": 0
        },
        {
          "at": 0.15,
          "value": 1
        },
        {
          "at": 1,
          "value": 0
        }
      ]
    },
    "defeat": {
      "name": "撃破",
      "color": "#bda68b",
      "count": 8,
      "durationMs": 360,
      "size": 4,
      "speed": 80,
      "directionDeg": 90,
      "spreadDeg": 150,
      "gravity": 300,
      "shape": "square",
      "scale": [
        {
          "at": 0,
          "value": 0.5
        },
        {
          "at": 0.15,
          "value": 1
        },
        {
          "at": 1,
          "value": 0.2
        }
      ],
      "alpha": [
        {
          "at": 0,
          "value": 0
        },
        {
          "at": 0.15,
          "value": 1
        },
        {
          "at": 1,
          "value": 0
        }
      ]
    }
  },
  "paths": {
    "arc": {
      "name": "弧と残像",
      "color": "#f4d49c",
      "width": 28,
      "height": 4,
      "durationMs": 300,
      "arc": -80,
      "trail": 5
    },
    "beam": {
      "name": "光線",
      "color": "#bde9ff",
      "width": 8,
      "height": 4,
      "durationMs": 260,
      "arc": 0,
      "trail": 0,
      "beam": true
    },
    "arrow": {
      "name": "弓矢の弧と残像",
      "color": "#f4d49c",
      "width": 28,
      "height": 3,
      "durationMs": 130,
      "arc": -18,
      "trail": 3
    }
  },
  "timelines": {
    "swing": {
      "name": "振り抜き",
      "tracks": [
        {
          "kind": "synth",
          "atMs": 0,
          "profile": "swing",
          "target": "target"
        }
      ]
    },
    "bow": {
      "name": "弓の射出",
      "tracks": [
        {
          "kind": "synth",
          "atMs": 0,
          "profile": "bow",
          "target": "target"
        }
      ]
    },
    "slash": {
      "name": "斬撃",
      "tracks": [
        {
          "kind": "synth",
          "atMs": 0,
          "profile": "slash",
          "target": "target"
        },
        {
          "kind": "particles",
          "atMs": 0,
          "profile": "slash",
          "target": "target"
        }
      ]
    },
    "pierce": {
      "name": "刺突",
      "tracks": [
        {
          "kind": "synth",
          "atMs": 0,
          "profile": "pierce",
          "target": "target"
        },
        {
          "kind": "particles",
          "atMs": 0,
          "profile": "pierce",
          "target": "target"
        }
      ]
    },
    "heavy": {
      "name": "打撃",
      "tracks": [
        {
          "kind": "synth",
          "atMs": 0,
          "profile": "heavy",
          "target": "target"
        },
        {
          "kind": "particles",
          "atMs": 0,
          "profile": "heavy",
          "target": "target"
        }
      ]
    },
    "critical": {
      "name": "会心",
      "tracks": [
        {
          "kind": "synth",
          "atMs": 0,
          "profile": "critical",
          "target": "target"
        },
        {
          "kind": "particles",
          "atMs": 0,
          "profile": "critical",
          "target": "target"
        }
      ]
    },
    "guard": {
      "name": "防御",
      "tracks": [
        {
          "kind": "synth",
          "atMs": 0,
          "profile": "guard",
          "target": "target"
        },
        {
          "kind": "particles",
          "atMs": 0,
          "profile": "guard",
          "target": "target"
        }
      ]
    },
    "heal": {
      "name": "回復",
      "tracks": [
        {
          "kind": "synth",
          "atMs": 0,
          "profile": "heal",
          "target": "target"
        },
        {
          "kind": "particles",
          "atMs": 0,
          "profile": "heal",
          "target": "target"
        }
      ]
    },
    "fire": {
      "name": "炎",
      "tracks": [
        {
          "kind": "synth",
          "atMs": 0,
          "profile": "fire",
          "target": "target"
        },
        {
          "kind": "particles",
          "atMs": 0,
          "profile": "fire",
          "target": "target"
        }
      ]
    },
    "ice": {
      "name": "氷",
      "tracks": [
        {
          "kind": "synth",
          "atMs": 0,
          "profile": "ice",
          "target": "target"
        },
        {
          "kind": "particles",
          "atMs": 0,
          "profile": "ice",
          "target": "target"
        }
      ]
    },
    "lightning": {
      "name": "雷",
      "tracks": [
        {
          "kind": "synth",
          "atMs": 0,
          "profile": "lightning",
          "target": "target"
        },
        {
          "kind": "particles",
          "atMs": 0,
          "profile": "lightning",
          "target": "target"
        }
      ]
    },
    "defeat": {
      "name": "撃破",
      "tracks": [
        {
          "kind": "synth",
          "atMs": 0,
          "profile": "defeat",
          "target": "target"
        },
        {
          "kind": "particles",
          "atMs": 0,
          "profile": "defeat",
          "target": "target"
        }
      ]
    },
    "arc_demo": {
      "name": "曲射と着弾",
      "tracks": [
        {
          "kind": "path",
          "profile": "arc",
          "atMs": 0,
          "target": "target"
        },
        {
          "kind": "synth",
          "profile": "bow",
          "atMs": 0,
          "target": "source"
        },
        {
          "kind": "synth",
          "profile": "pierce",
          "atMs": 300,
          "target": "target"
        },
        {
          "kind": "particles",
          "profile": "pierce",
          "atMs": 300,
          "target": "target"
        }
      ]
    },
    "beam_demo": {
      "name": "光線と連続火花",
      "tracks": [
        {
          "kind": "path",
          "profile": "beam",
          "atMs": 0,
          "target": "target"
        },
        {
          "kind": "synth",
          "profile": "lightning",
          "atMs": 0,
          "target": "target"
        },
        {
          "kind": "particles",
          "profile": "lightning",
          "atMs": 30,
          "target": "target",
          "repeat": 3,
          "intervalMs": 80
        }
      ]
    }
  },
  "bindings": {
    "swing": "swing",
    "bow": "bow",
    "slash": "slash",
    "pierce": "pierce",
    "heavy": "heavy",
    "critical": "critical",
    "guard": "guard",
    "heal": "heal",
    "fire": "fire",
    "ice": "ice",
    "lightning": "lightning",
    "defeat": "defeat"
  },
  "materials": {
    "flesh": "material_flesh",
    "metal": "material_metal",
    "shield": "material_shield",
    "stone": "material_stone",
    "wood": "material_wood",
    "water": "material_water"
  },
  "materialSprites": {
    "construct": "metal",
    "skeleton": "stone",
    "slime": "water"
  },
  "mixer": {
    "maxSynthVoices": 24,
    "maxRecordedVoices": 8,
    "duckGain": 0.64,
    "duckHoldMs": 70,
    "duckReleaseMs": 120,
    "duckPriority": 70,
    "compressor": {
      "threshold": -6,
      "knee": 8,
      "ratio": 8,
      "attack": 0.003,
      "release": 0.12
    }
  }
};
