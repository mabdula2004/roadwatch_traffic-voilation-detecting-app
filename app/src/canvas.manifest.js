export const manifest = {
  screens: {
    scr_563kc4: { name: "Onboarding", route: "/", position: { "x": 160, "y": 220 } },
    scr_k9yh4f: { name: "Onboarding — Safety Step", route: "/", state: { "onboardingStep": 3 }, position: { "x": 1560, "y": 220 } },
    scr_2dql2z: { name: "Live Capture", route: "/capture", position: { "x": 160, "y": 2200 } },
    scr_heryte: { name: "Vault — Pending Uploads", route: "/vault", position: { "x": 160, "y": 4180 } },
    scr_w2jdac: { name: "Settings", route: "/settings", position: { "x": 160, "y": 12100 } },
    scr_w5f6tc: { name: "Citizen Wallet", route: "/wallet", position: { "x": 160, "y": 6160 } },
    scr_9jc93j: { name: "Safety and Privacy", route: "/safety", position: { "x": 1560, "y": 12100 } },
    scr_fudimk: { name: "Speed Lock Active", route: "/capture", state: { "speed": 46 }, position: { "x": 1560, "y": 2200 } },
    scr_h2se4h: { name: "Report Review", route: "/review", position: { "x": 2960, "y": 2200 } },
    scr_19p99r: { name: "Vault — Sealed Reports", route: "/vault", state: { "vaultTab": "Sealed reports" }, position: { "x": 1560, "y": 4180 } },
    scr_luk3hj: { name: "Fine Details & Dispute", route: "/wallet/fine/CH-88421", position: { "x": 1560, "y": 6160 } },
    scr_x0xyj8: { name: "Plate Search", route: "/search", position: { "x": 160, "y": 8140 } },
    scr_fmxcly: { name: "Plate Search — Result", route: "/search", state: { "plateQuery": "LEB-9931" }, position: { "x": 1560, "y": 8140 } },
    scr_yddqzh: { name: "Command — Pending Queue", route: "/command", position: { "x": 160, "y": 10120 } },
    scr_szdps9: { name: "Command — Disputed Cases", route: "/command", state: { "commandTab": "Disputed Cases" }, position: { "x": 1560, "y": 10120 } },
    scr_77fxcf: { name: "Command — Fraud Alerts", route: "/command", state: { "commandTab": "Fraud Alerts" }, position: { "x": 2960, "y": 10120 } },
    scr_6e43r1: { name: "Command — Approved Today", route: "/command", state: { "commandTab": "Approved Today" }, position: { "x": 4360, "y": 10120 } },
    scr_x10k43: { name: "Command — Reporter Registry", route: "/command", state: { "commandTab": "Reporter Registry" }, position: { "x": 5760, "y": 10120 } },
    scr_ma9ujo: { name: "Geofence Map", route: "/command/map", position: { "x": 7160, "y": 10120 } },
    scr_b99j4k: { name: "Fleet Manager", route: "/command/fleet", position: { "x": 8560, "y": 10120 } },
    scr_u898cw: { name: "E-Sahulat Kiosk", route: "/kiosk", position: { "x": 160, "y": 14080 } },
    scr_prof01: { name: "Profile Settings", route: "/settings/profile", position: { "x": 2960, "y": 12100 } },
    scr_pass01: { name: "Change Password", route: "/settings/password", position: { "x": 4360, "y": 12100 } }
  },
  sections: {
    sec_olo50i: { name: "Onboarding", x: 0, y: 0, width: 2920, height: 1180 },
    sec_jt24k9: { name: "Capture & Review", x: 0, y: 1980, width: 4320, height: 1180 },
    sec_9zmizk: { name: "Vault", x: 0, y: 3960, width: 2920, height: 1180 },
    sec_lrc5ce: { name: "Wallet & Fines", x: 0, y: 5940, width: 2920, height: 1180 },
    sec_9vm59s: { name: "Plate Search", x: 0, y: 7920, width: 4320, height: 1180 },
    sec_uwebj7: { name: "Command Center", x: 0, y: 9900, width: 9920, height: 1180 },
    sec_nfui5a: { name: "Settings", x: 0, y: 11880, width: 2920, height: 1180 },
    sec_mqly7g: { name: "Kiosk", x: 0, y: 13860, width: 1520, height: 1180 }
  },
  layers: [
  { kind: "section", id: "sec_olo50i", children: [
    { kind: "screen", id: "scr_563kc4" },
    { kind: "screen", id: "scr_k9yh4f" }]
  },
  { kind: "section", id: "sec_jt24k9", children: [
    { kind: "screen", id: "scr_2dql2z" },
    { kind: "screen", id: "scr_fudimk" },
    { kind: "screen", id: "scr_h2se4h" }]
  },
  { kind: "section", id: "sec_9zmizk", children: [
    { kind: "screen", id: "scr_heryte" },
    { kind: "screen", id: "scr_19p99r" }]
  },
  { kind: "section", id: "sec_lrc5ce", children: [
    { kind: "screen", id: "scr_w5f6tc" },
    { kind: "screen", id: "scr_luk3hj" }]
  },
  { kind: "section", id: "sec_9vm59s", children: [
    { kind: "screen", id: "scr_x0xyj8" },
    { kind: "screen", id: "scr_fmxcly" }]
  },
  { kind: "section", id: "sec_uwebj7", children: [
    { kind: "screen", id: "scr_yddqzh" },
    { kind: "screen", id: "scr_szdps9" },
    { kind: "screen", id: "scr_77fxcf" },
    { kind: "screen", id: "scr_6e43r1" },
    { kind: "screen", id: "scr_x10k43" },
    { kind: "screen", id: "scr_ma9ujo" },
    { kind: "screen", id: "scr_b99j4k" }]
  },
  { kind: "section", id: "sec_nfui5a", children: [
    { kind: "screen", id: "scr_w2jdac" },
    { kind: "screen", id: "scr_9jc93j" },
    { kind: "screen", id: "scr_prof01" },
    { kind: "screen", id: "scr_pass01" }]
  },
  { kind: "section", id: "sec_mqly7g", children: [
    { kind: "screen", id: "scr_u898cw" }]
  }]

};