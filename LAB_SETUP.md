# Phase 1: Vulnerable Lab Setup & Verification

## 1. Target Application Overview

**Application:** InsecureBankv2
**Package Name:** `com.android.insecurebankv2`
**Description:** InsecureBankv2 is an intentionally vulnerable Android banking application maintained for security training purposes. It simulates a real-world mobile banking client (login, balance view, fund transfer, password change) while deliberately implementing common mobile security anti-patterns — hardcoded cryptographic keys, exported activities without permission checks, cleartext network transport, and weak local data protection.

**Backend Component:** The application communicates with a companion Python "AndroLab" server that handles authentication and transaction logic. For this assessment, the backend was run locally and exposed on `10.0.2.2:8080` (the emulator's host-loopback alias), which is the endpoint captured throughout the dynamic testing phases.

**Rationale for Selection:** InsecureBankv2 was chosen because it maps cleanly onto multiple OWASP Mobile Top 10 categories (M2 Insecure Data Storage, M3 Insecure Communication, M4 Insecure Authentication, M8 Code Tampering/Reverse Engineering) within a single, realistic application context, allowing both static and dynamic findings to be cross-validated against the same codebase.

## 2. Host Architecture & Environment Setup
A robust local penetration testing environment was established on a Windows 11 host.

> **Note on Testing Platform:** The assessment guidelines specify ArcForge as the mandatory testing environment. At the time of this assessment, ArcForge was unavailable due to a platform outage. Authorization was obtained to use a local Windows 11 workstation as a fallback testing environment, with all tooling, methodology, and reporting standards kept identical to the ArcForge-mandated workflow.

### Toolchain Installation & System Path Integration
The following core utilities were manually installed, verified, and added to the global System environment variables (`PATH`) to ensure seamless command-line access:
* **Android Debug Bridge (ADB) (v1.0.41):** Essential for device communication, package management, and runtime shell interaction.
* **APKTool (v3.0.2):** Configured with the appropriate wrapper script for binary resource decoding and rebuilding.
* **Jadx-GUI (v1.5.5):** Decompiler environment for translating Dalvik executable (`.dex`) bytecode into human-readable Java code.
* **Frida (v17.15.0):** Installed via `pip install frida-tools` on the host, paired with a matching-version `frida-server` binary pushed to the emulator (`/data/local/tmp`) and executed with root privileges for runtime instrumentation.

* **Burp Suite Community Edition (v2026.4.3):** Configured as an intercepting proxy for runtime network traffic analysis (see Section 5).

---

## 3. Emulator Configuration & Security Controls
An Android Virtual Device (AVD) was built from the ground up using Android Studio's Device Manager to meet precise testing prerequisites:

* **Device Profile:** Google Pixel 6
* **System Image:** Android 12.0 (S) | API Level 31
* **Architecture:** x86_64
* **Target Framework:** Google APIs

> **Security Rationale:** A "Google APIs" system image was deliberately selected over a standard "Google Play" image. Production Google Play builds enforce strict kernel-level lockouts that prohibit root privilege escalation. The Google APIs flavor provides standard developer frameworks while allowing full administrative control over the underlying Linux sub-system via the Android Debug Bridge.

---

## 4. Environment Verification & Privilege Escalation
Before deploying target applications, the environment's integrity and root availability were actively tested via the terminal.

```bash
# Verify active emulator attachment
C:\Users\Adarsh> adb devices
List of devices attached
emulator-5554   device

# Request administrative root privileges on the daemon
C:\Users\Adarsh> adb root
restarting adbd as root

# Confirm low-level root access within the Android shell
C:\Users\Adarsh> adb shell id
uid=0(root) gid=0(root) groups=0(root) context=u:r:su:s0
```

---

## 5. Network Interception Proxy Configuration

To capture and analyze the application's runtime HTTP traffic in Phase 3, the Android Virtual Device's network stack was configured to route all outbound traffic through a local Burp Suite proxy listener.

**Configuration Path:** Emulator Extended Controls → Settings → Proxy → Manual proxy configuration

* **Host name:** `10.0.2.2` (the special alias the Android emulator uses to reach the host loopback interface)
* **Port number:** `8080`
* **Proxy authentication:** Disabled
* **Android Studio HTTP proxy settings override:** Unchecked, to ensure the manual configuration was applied directly

This configuration forces every HTTP request issued by the emulator — including InsecureBankv2's login and transaction calls — through Burp Suite's intercepting proxy, enabling full request/response capture for the dynamic analysis phase (see `DYNAMIC_ANALYSIS_REPORT.md`).
