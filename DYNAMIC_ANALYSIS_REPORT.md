# Phase 3: Dynamic Analysis Report

**Target Application:** InsecureBankv2  
**Assessment Environment:** Windows 11 Local Testing Environment (Burp Suite & ADB Integration)  
**Objective:** Intercept and analyze runtime API endpoint communications and audit local storage data persistence mechanisms under live execution.

---

## 1. Insecure Data Transmission (OWASP Mobile M3: Insecure Communication)

### Vulnerability 1.1: Cleartext Transmission of Sensitive Credentials
* **Severity:** High
* **Captured Endpoint:** `POST http://10.0.2.2:8080/login`
* **Description:** During runtime network capturing using Burp Suite proxy configurations, the mobile application was observed communicating with its API endpoints utilizing cleartext HTTP/1.1 protocols rather than enforcing TLS/HTTPS.
* **Impact:** An adversary performing a Man-in-the-Middle (MitM) attack on an unencrypted or public network access point can easily sniff outbound transport layer packets to extract user authentication parameters in raw form without breaking any cryptographic controls.

#### Evidence (Outbound HTTP Request Payload):

```http
POST /login HTTP/1.1
Content-Length: 40
Content-Type: application/x-www-form-urlencoded
Host: 10.0.2.2:8080
Connection: keep-alive
User-Agent: Apache-HttpClient/UNAVAILABLE (java 1.4)

username=dinesh&password=Dinesh%40123%24
```

**Note:** The password parameters are weakly URL-encoded (`%40` = `@`, `%24` = `$`), exposing the plaintext password value `[REDACTED]` directly over the network map.

* **Remediation Recommendation:** Enforce global App-wide TLS layers. Define an explicit App Network Security Configuration (`network_security_config.xml`) that restricts cleartext communication channels by executing `android:usesCleartextTraffic="false"`.

---

## 2. Authentication & Session Management Flaws (OWASP Mobile M4: Insecure Authentication)

### Vulnerability 2.1: Lack of Secure Token-Based Session Management
* **Severity:** High
* **Captured Endpoint:** Response from `POST /login`
* **Description:** Evaluation of the backend authorization profile response indicates a complete absence of cryptographic state validation controls (such as JWT, secure cookies, or active token hashes).
* **Impact:** Because the server handles user tracking statelessly and returns a static JSON success string rather than generating a random, time-bound authorization cookie or token signature, the client is forced to handle user authorization locally. Attackers can exploit this structural flaw by tampering with API endpoints or spoofing responses to achieve client-side authentication bypasses.

#### Evidence (Inbound Server HTTP Response Payload):

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 52
Date: Fri, 19 Jun 2026 20:54:13 GMT
Server: localhost

{"message": "Correct Credentials", "user": "dinesh"}
```

* **Remediation Recommendation:** Rearchitect the authentication pipeline. The backend authentication server must issue unique, cryptographically signed session signatures (e.g., JSON Web Tokens (JWT) or secure HTTP-only session cookies) upon successful authentication. Every subsequent transaction API call must validate this ephemeral key structure at the server level prior to parsing client transactions.

---

## 3. Insecure Local Data Storage (OWASP Mobile M2: Insecure Data Storage)

### Vulnerability 3.1: Reversible Encryption of Credentials in SharedPreferences
* **Severity:** High
* **Captured Context:** `/data/data/com.android.insecurebankv2/shared_prefs/mySharedPreferences.xml` via ADB Shell
* **Description:** Runtime file system analysis confirms that when the "Remember Me" function is processed, user credentials are encrypted and saved locally inside an XML file. However, static code analysis reveals that the application utilizes a weak custom implementation dependent on a static, hardcoded master key string (`"This is the super secret key 123"`) inside `CryptoClass.java`.

#### Evidence (Live ADB Shell Extraction):

```bash
D:\MobilePentest>adb shell cat /data/data/com.android.insecurebankv2/shared_prefs/mySharedPreferences.xml
<?xml version='1.0' encoding='utf-8' standalone='yes' ?>
<map>
    <string name="superSecurePassword">DTrW2VXjSoFdg0e61fHxJg==&#10;    </string>
    <string name="EncryptedUsername">ZGluZXNo&#13;&#10;    </string>
</map>
```

* **Impact:** Although the data appears safely encrypted to an unprivileged user browsing the directory, the encryption is completely reversible. Any attacker or malicious application capable of obtaining root access or exploiting a backup flaw can extract the ciphertext from `mySharedPreferences.xml`, decompile the APK to recover the static key, and instantly decrypt the victim's plaintext username and password. Notably, the `EncryptedUsername` field provides no cryptographic protection whatsoever — it is plain Base64 encoding (`ZGluZXNo` decodes directly to `dinesh`), reversible without any key material at all.
* **Remediation Recommendation:** Migrate local key storage immediately to the native Android Keystore System. Cryptographic keys used to protect local application files must be generated dynamically at runtime within the hardware-backed storage vault, rendering the key material unextractable even if the device environment is entirely compromised.

> **Cross-Reference:** Runtime hooking of the encryption routine itself (`CryptoClass.aesEncryptedString`) using Frida to capture plaintext at the point of encryption — including a live capture of the user's actual password mid-encryption — is documented in Phase 4, see `MOBILE_VULNERABILITY_REPORT.md`, Vulnerability 4.1.
