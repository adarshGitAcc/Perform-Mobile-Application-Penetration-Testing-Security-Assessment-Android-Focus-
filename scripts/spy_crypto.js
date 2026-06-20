Java.perform(function () {
    console.log("[*] Frida attached successfully! Targeting AES encryption methods...");

    var CryptoClass = Java.use("com.android.insecurebankv2.CryptoClass");

    // Hook the string encryption wrapper
    try {
        CryptoClass.aesEncryptedString.implementation = function (plaintextString) {
            console.log("\n======================================");
            console.log("[!] CRITICAL FLAW: Intercepted App Encryption!");
            console.log("[+] Target Method: aesEncryptedString");
            console.log("[+] Plaintext Extracted: " + plaintextString);
            console.log("======================================\n");
            
            // Let the app continue functioning normally so it doesn't crash
            return this.aesEncryptedString(plaintextString); 
        };
        console.log("[+] Successfully placed hook on aesEncryptedString");
    } catch (err) {
        console.log("[-] Failed to hook aesEncryptedString: " + err.message);
    }
});