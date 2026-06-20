# Comprehensive Mobile Application Security Assessment Report

**Target Application:** InsecureBankv2  
**Testing Environment:** Windows 11 Local Host (Android Studio Emulator Integration)  
**Assessment Framework:** OWASP Mobile Top 10 Risks  
**Date of Assessment:** June 20, 2026  
**Status:** Completed Evaluation  

---

## 1. Executive Summary
This document acts as the definitive security evaluation report for the **InsecureBankv2** mobile banking application. The review encompassed extensive static code analysis (reverse-engineering compiling architectures, inspecting Android manifest specifications) and live dynamic instrumentation (intercepting unencrypted proxy traffic and conducting dynamic API hook points via Frida). All testing, replication, and vulnerability validations were successfully performed locally on a Windows 11 development workstation.

---

## 2. Scope & Methodology

**In Scope:**
* InsecureBankv2 Android client application (`com.android.insecurebankv2`), all activities, exported components, and local storage mechanisms.
* The local "AndroLab" backend server (`10.0.2.2:8080`) insofar as its responses to the mobile client were observable via proxy interception.
* Static source analysis (decompiled via JADX/APKTool) and dynamic runtime analysis (emulator + Frida + Burp Suite) against the same application build.

**Out of Scope:**
* The AndroLab backend server's internal implementation, infrastructure, and any server-side source code.
* SQLite database content and external storage paths (not assessed in this testing cycle — see `MOBILE_VULNERABILITY_REPORT.md`, Section 1).
* Client-side injection testing (WebView/JS interface, content provider injection) (not assessed in this testing cycle — see `MOBILE_VULNERABILITY_REPORT.md`, Section 5).
* iOS testing and multi-application comparison (bonus scope items, not pursued in this assessment cycle).

**Methodology:** Testing followed the OWASP Mobile Application Security Testing Guide (MASTG) approach, structured around the OWASP Mobile Top 10 (2016) risk categories, and proceeded in four technical phases: lab setup and target selection, static analysis, dynamic/runtime analysis, and mobile-specific vulnerability validation. Each finding below was independently reproduced and captured with command-line or proxy evidence rather than relying on tooling output alone.

**Testing Platform Note:** ArcForge, the mandated testing platform, was unavailable due to a platform outage during the assessment window. Testing was conducted on an authorized local Windows 11 fallback environment using Frida, APKTool, JADX, and Burp Suite.

---

## 3. Summary of Completed Phases & Deliverables

### Phase 1: Lab Infrastructure Deployment
* **Status:** Complete (Verified)
* **Configuration:** Established an isolated testing loop utilizing a local Windows 11 Android Studio virtual device environment. Network interception pipelines route directly through a local Burp Suite proxy interface at port `8080`, talking to the Python AndroLab Server backend executing on port `8888`.

### Phase 2: Static Analysis Audit
* **Status:** Complete (Documented in `STATIC_ANALYSIS_REPORT.md`)
* **Primary Discoveries:** * Insecure application profiling parameters (`android:debuggable="true"` and `android:allowBackup="true"`) are explicitly active in the base deployment manifest.
  * Excessive Inter-Process Communication (IPC) surface exposure across core activities (`DoTransfer`, `ViewStatement`, `ChangePassword`, and `TrackUserContentProvider`) due to missing protection levels on exported interfaces.
  * Hardcoded symmetric master secret (`"This is the super secret key 123"`) embedded within `CryptoClass.java`.
 

### Phase 3: Dynamic Network & API Analysis
* **Status:** Complete (Documented in `DYNAMIC_ANALYSIS_REPORT.md`)
* **Primary Discoveries:**
  * Outbound login traffic transmits highly sensitive user credentials over unencrypted, plaintext HTTP/1.1 protocols.
  * Absolute absence of state management or secure session structures (such as JWTs or signed HTTP cookies) within backend responses.
  * Reversible cryptographic storage of credentials saved in the local Android sandboxed file space (`mySharedPreferences.xml`).

### Phase 4: Mobile-Specific Runtime Vulnerability Testing
* **Status:** Complete (Documented in `MOBILE_VULNERABILITY_REPORT.md`)
* **Primary Discoveries:**
  * Total absence of binary hardening, code obfuscation (ProGuard), or runtime application self-protection mechanisms (RASP).
  * Live Frida hook on `CryptoClass.aesEncryptedString` successfully captured the user's actual plaintext password (`[REDACTED]`) at the exact moment it entered the encryption routine, confirming that local instrumentation access bypasses all cryptographic protections entirely.

---

## 4. Risk Rating Summary

| # | Finding | Severity | Source Phase |
| :-- | :--- | :--- | :--- |
| 1 | Hardcoded master cryptographic key in `CryptoClass.java` | Critical | Phase 2 (Static) |
| 2 | Excessive exported components (IPC attack surface) | High | Phase 2 (Static) |
| 3 | Plaintext credentials stored via reversible SharedPreferences encryption | High | Phase 2 (Static) / Phase 3 (Dynamic) |
| 4 | Cleartext (HTTP) transmission of login credentials | High | Phase 3 (Dynamic) |
| 5 | Absence of secure server-side session/token management | High | Phase 3 (Dynamic) |
| 6 | Missing Runtime Application Self-Protection (RASP) / unrestricted Frida instrumentation | High | Phase 4 (Mobile-Specific) |
| 7 | `debuggable` and `allowBackup` flags enabled in production manifest | Medium | Phase 2 (Static) |
| 8 | `EncryptedUsername` field uses Base64 encoding only, no actual encryption | Medium | Phase 3 (Dynamic) |

**Overall Application Risk Rating: Critical.** The combination of a hardcoded, statically-extractable master key with cleartext network transport means an attacker on the same network as a victim can capture credentials directly, while an attacker with local/root device access can recover and decrypt all locally stored credentials without needing the network capture at all. Both independent attack paths lead to full account compromise.

---

## 5. OWASP Mobile Top 10 Mapping

| OWASP Category | Tested | Result |
| :--- | :--- | :--- |
| M1: Improper Platform Usage | Yes | Vulnerable — debuggable/backup flags, exported components |
| M2: Insecure Data Storage | Yes | Vulnerable — reversible SharedPreferences encryption, Base64-only username field |
| M3: Insecure Communication | Yes | Vulnerable — cleartext HTTP login traffic |
| M4: Insecure Authentication | Yes | Vulnerable — no server-issued session token/JWT |
| M5: Insufficient Cryptography | Yes | Vulnerable — hardcoded static master key |
| M6: Insecure Authorization | No | Not assessed this cycle |
| M7: Client Code Quality | Partial | Reviewed during JADX source inspection; no dedicated injection testing performed |
| M8: Code Tampering | Yes | Vulnerable — no anti-instrumentation/anti-hooking controls (Frida attached without resistance) |
| M9: Reverse Engineering | Yes | Vulnerable — no obfuscation; class/method names fully readable post-decompilation |
| M10: Extraneous Functionality | No | Not assessed this cycle |

---

## 6. Global Technical Remediation Blueprint

To systematically transition the InsecureBankv2 application into a hardened production-ready state, the engineering team must implement the following architectural mitigations:

### 6.1 Transport Layer Protections (OWASP M3: Insecure Communication)
* **Action:** Restrict cleartext communication channels unconditionally by establishing an explicit App Network Security Configuration (`network_security_config.xml`) setting `android:usesCleartextTraffic="false"`. Mandate TLS 1.3 for all backend endpoints.

### 6.2 Secure Identity & Token Architecture (OWASP M4: Insecure Authentication)
* **Action:** Deprecate client-side local authentication persistence. Implement server-side verification that issues short-lived, cryptographically signed JSON Web Tokens (JWT) or secure HTTP-only session cookies upon every validation request.

### 6.3 Hardware-Backed Cryptography (OWASP M2: Insecure Data Storage / M5: Insufficient Cryptography)
* **Action:** Permanently strip out all hardcoded plaintext encryption key values from the class libraries. Migrate local file tracking mechanisms away from standard SharedPreferences to `EncryptedSharedPreferences`. Ensure all secret validation keys are handled through the native **Android Keystore System**, rooting security within the device's hardware-isolated Secure Enclave.

### 6.4 Binary Hardening & Dynamic Self-Protection (OWASP M8: Code Tampering / M9: Reverse Engineering)
* **Action:** Enforce active obfuscation policies via ProGuard/R8 to strip out logical class designations during compilation. Inject native-layer anti-debugging validation sequences to systematically abort the process thread if an unauthorized instrumentation daemon (such as Frida or JDB) attempts to attach to runtime memory.