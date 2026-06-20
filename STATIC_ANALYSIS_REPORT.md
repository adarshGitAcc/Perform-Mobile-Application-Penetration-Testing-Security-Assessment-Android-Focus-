# Phase 2: Static Analysis Report

**Target Application:** InsecureBankv2  
**Assessment Environment:** Windows 11 Local Testing Environment (Authorized local fallback testing profile)  
**Objective:** Decompile, review source code, identify static security vulnerabilities, and implement configuration hardening.

---

## 1. Automated Static Scan (MobSF)

> **[PENDING — fill in once MobSF scan completes]**
> MobSF (Mobile Security Framework) was used to perform an automated static scan of the InsecureBankv2 APK, supplementing the manual JADX/APKTool review below.
> * **MobSF Security Score:** `[score / grade — TODO]`
> * **Key Automated Findings:** `[list permissions flagged, manifest issues flagged, any additional findings surfaced that manual review didn't catch — TODO]`
> * **Evidence:** MobSF dashboard screenshot — `Evidence/MobSF_Scan.png`

---

## 2. AndroidManifest.xml Component & Flag Hardening

### Vulnerability 1.1: Production Debugging & Backup Enabled
* **Severity:** Medium
* **Description:** The baseline application profile left `android:debuggable="true"` and `android:allowBackup="true"` active. 
* **Impact:** Allowing application backups enables local data extraction via standard Android Debug Bridge (`adb backup`) without root privileges. Keeping debugging active allows attackers to attach runtime debuggers (`jdb`) to trace memory values and alter logical flow control.
* **Remediation Recommendation:** Explicitly set both flags to `false` in the production manifest configuration prior to release. A reference patched manifest (`safe_manifest.xml`) was produced during this assessment to demonstrate the corrected configuration.

### Vulnerability 1.2: Excessive Inter-Process Communication (IPC) Attack Surface
* **Severity:** High
* **Description:** Multiple critical application interfaces were configured with the structural property `android:exported="true"`.
* **Impact:** Rogue or unauthorized third-party mobile applications installed on the same smartphone device could directly launch internal pages and access sensitive functions without authenticating via the primary login terminal screen.
* **Remediation Recommendation:** Audit and reconfigure the component tree to remove unnecessary IPC exposure. A reference remediation mapping was produced during this assessment showing the corrected `exported` posture:

| Component Package/Name | Baseline Status | Remediated Status | Attack Risk Mitigated |
| :--- | :--- | :--- | :--- |
| `com.android.insecurebankv2.DoTransfer` | Exported (`true`) | Private (`false`) | Unauthorized transaction triggers |
| `com.android.insecurebankv2.ViewStatement` | Exported (`true`) | Private (`false`) | Local financial data theft |
| `com.android.insecurebankv2.ChangePassword` | Exported (`true`) | Private (`false`) | Local Account Takeover (ATO) |
| `com.android.insecurebankv2.TrackUserContentProvider` | Exported (`true`) | Private (`false`) | SQL Injection & raw DB dumping |

---

## 3. Hardcoded Secrets & Cryptographic Flaws

### Vulnerability 2.1: Hardcoded Master Cryptographic Key
* **Severity:** Critical
* **Vulnerable Class File:** `com.android.insecurebankv2.CryptoClass`
* **Discovered Key Material:** `"This is the super secret key 123"`
* **Description:** The source code review identified that the application utilizes a static, plaintext string as its symmetric master key for encryption processes instead of using a secure, hardware-backed key store system.
* **Impact:** Because the secret key is hardcoded directly into the compiled application logic, any reverse-engineer using standard decompilers (like JADX-GUI) can extract the key material instantly. This compromises the entire security posture of the app, as an attacker can easily decrypt any local database or intercepted network payloads.

```java
// Vulnerable Code Snippet Discovered:
public static byte[] des2(String str) throws Exception {
    String secretKey = "This is the super secret key 123";
    // Cryptographic initialization logic using the hardcoded key material...
}
```

* **Remediation Recommendation:** Remove all inline plaintext cryptographic keys. Migrate the application's cryptographic infrastructure to utilize the official Android Keystore System (AndroidKeyStore), ensuring keys are generated inside the device's Secure Enclave / Trusted Execution Environment (TEE).

---

## 4. Insecure Local Data Storage

### Vulnerability 4.1: Plaintext Credentials inside SharedPreferences
* **Severity:** High
* **Vulnerable Context:** LoginActivity / mySharedPreferences.xml
* **Description:** When evaluating the user login retention mechanisms ("Remember Me"), source code analysis indicates that the application writes user authentication profiles locally into private application file space using standard XML persistence without sufficient abstraction layers. This was confirmed via runtime extraction in Phase 3 (see `DYNAMIC_ANALYSIS_REPORT.md`), which pulled the live `mySharedPreferences.xml` file from the device.
* **Impact:** Although protected by native Linux file-system permissions under non-root contexts, if the host device environment is rooted, or if an adversary chains a local directory traversal vulnerability, the plaintext credentials can be cloned directly off the physical storage block. Notably, the `EncryptedUsername` field — despite its name — is not encrypted at all: it is plain Base64 encoding of the username (`ZGluZXNo` decodes directly to `dinesh`), making it trivially reversible without any key material. Only the `superSecurePassword` field undergoes actual symmetric encryption, and that encryption relies on the hardcoded key documented in Vulnerability 3.1.
* **Remediation Recommendation:** Sensitive credentials should never be stored permanently on the local file system, encoded or otherwise. If local user token persistence is mandatory, replace standard SharedPreferences with EncryptedSharedPreferences from the Android Jetpack Security library, ensuring encryption keys are rooted inside the hardware-backed native Keystore provider. Base64 encoding must never be presented or relied upon as a confidentiality control.

---

## 5. Vulnerable Libraries & Dependency Analysis

> **[PENDING — fill in once MobSF scan completes]**
> Third-party libraries bundled within the APK were reviewed for known CVEs using MobSF's dependency analysis. `[Document specific outdated/vulnerable libraries flagged, or note that no known-vulnerable dependencies were identified, with the MobSF scan date as evidence of currency — TODO]`
