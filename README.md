# 🚦 RoadWatch — Civic Traffic Enforcement & Evidence Verification Ecosystem

[![React](https://img.shields.io/badge/Dashboard-React_19_(Pure_JSX)-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![React Native](https://img.shields.io/badge/Mobile-React_Native_/_Expo_57-4630EB?logo=expo&logoColor=white)](https://expo.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS_3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase_PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Vite](https://img.shields.io/badge/Bundler-Vite_6.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**RoadWatch** is a production-grade, end-to-end civic traffic violation reporting and police enforcement audit platform. It bridges citizens on the road with municipal traffic authorities through a high-trust verification pipeline featuring **cryptographic evidence capture**, **AI-assisted violation and license plate analysis**, **real-time Supabase cloud synchronization**, and a dedicated **Officer Command Audit Dashboard**.

---

### 1. 📱 Citizen Reporter (`reporter`)
- **Who they are:** Any everyday citizen, driver, pedestrian, or commuter registered on the mobile application.
- **Primary Objectives:** Safely record dangerous traffic violations, submit genuine video evidence, track citation status, earn civic bounties, and maintain a high personal Trust Score.
- **Capabilities & Actions:**
  - Authenticate using Pakistani Phone OTP and register with a privacy-preserving SHA-256 CNIC digest (only last 4 digits stored).
  - Launch Native Live Capture HUD with live orientation sensors, GPS telemetry, and a mandatory 10-second capture limiter.
  - Review AI-detected violation classification and detected license plate before submission.
  - Inspect personal submissions inside the **Evidence Vault** (Sealed vs. Pending Review).
  - Accumulate reward bounties in the **Civic Wallet (PKR)** for verified violations.
  - File **Dispute Appeals** (with a PKR 100 refundable bond) if a valid submission is rejected.
  - Access one-tap Emergency SOS (Rescue 1122 / Police 15) during road incidents.

---

### 2. 👮 Traffic Police Officer / Verifier (`officer`)
- **Who they are:** Municipal traffic enforcement personnel stationed at command centers or audit desks.
- **Primary Objectives:** Rapidly verify incoming citizen reports, adjudicate citations with human-in-the-loop accountability, prevent wrongful fines, and resolve citizen appeals.
- **Capabilities & Actions:**
  - Access the live, zero-latency **Pending Verification Queue** via WebSocket updates without refreshing.
  - Use the full-featured **Evidence Stage** to inspect:
    - High-definition in-browser MP4 video playback.
    - Extracted multi-angle keyframes (`frame_1.jpg`, `frame_2.jpg`, `frame_3.jpg`).
    - Verified capture GPS coordinates, date/time stamps, vehicle plate numbers, and reporter notes.
  - **One-Click Adjudication:**
    - **Accept Citation (`A` key):** Issues an official e-challan, adds PKR bounty to the citizen's wallet, and increments their Trust Score (+2).
    - **Reject Citation (`R` key):** Dismisses report with reason tagging (Blurry, Inconclusive, No Violation, Duplicate) and penalizes citizen Trust Score (-15) if fraudulent.
  - Adjudicate contested citizen appeals under the **Disputed Cases** tab.
  - Fast keyboard shortcuts (`A` Accept, `R` Reject, `Space` Play/Pause, `J`/`K` Navigate Queue).

---



**RoadWatch Ecosystem** — *Empowering safer roads through civic collaboration and transparent enforcement.*
