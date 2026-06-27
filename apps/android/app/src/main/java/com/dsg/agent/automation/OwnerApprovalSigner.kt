package com.dsg.agent.automation

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.PublicKey
import java.security.Signature

class OwnerApprovalSigner {
    companion object {
        const val KEY_ALIAS = "dsg_owner_approval_v1"
        const val SIGNATURE_ALGORITHM = "SHA256withECDSA"
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    }

    fun sign(command: AgentCommand): ApprovalSignature {
        val payload = command.canonicalApprovalPayload()
        val digest = AgentCommand.sha256(payload)
        if (digest != command.commandDigest) {
            throw IllegalStateException("Command digest mismatch before owner approval")
        }
        val signature = Signature.getInstance(SIGNATURE_ALGORITHM)
        signature.initSign(getOrCreatePrivateKey())
        signature.update(command.commandDigest.toByteArray(Charsets.UTF_8))
        val signatureBase64 = Base64.encodeToString(signature.sign(), Base64.NO_WRAP)
        return ApprovalSignature(
            commandDigest = command.commandDigest,
            signatureBase64 = signatureBase64,
            algorithm = SIGNATURE_ALGORITHM,
            keyAlias = KEY_ALIAS,
            approvedAt = System.currentTimeMillis(),
        )
    }

    fun verify(command: AgentCommand): Boolean {
        val approval = command.approvalSignature ?: return false
        if (approval.commandDigest != command.commandDigest) return false
        if (approval.algorithm != SIGNATURE_ALGORITHM) return false
        if (AgentCommand.sha256(command.canonicalApprovalPayload()) != command.commandDigest) return false
        val signature = Signature.getInstance(SIGNATURE_ALGORITHM)
        signature.initVerify(getPublicKey())
        signature.update(command.commandDigest.toByteArray(Charsets.UTF_8))
        return signature.verify(Base64.decode(approval.signatureBase64, Base64.NO_WRAP))
    }

    private fun getOrCreatePrivateKey(): PrivateKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        if (!keyStore.containsAlias(KEY_ALIAS)) {
            val generator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, ANDROID_KEYSTORE)
            generator.initialize(
                KeyGenParameterSpec.Builder(
                    KEY_ALIAS,
                    KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY,
                )
                    .setDigests(KeyProperties.DIGEST_SHA256)
                    .setUserAuthenticationRequired(false)
                    .build(),
            )
            generator.generateKeyPair()
        }
        return keyStore.getKey(KEY_ALIAS, null) as PrivateKey
    }

    private fun getPublicKey(): PublicKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        if (!keyStore.containsAlias(KEY_ALIAS)) getOrCreatePrivateKey()
        return keyStore.getCertificate(KEY_ALIAS).publicKey
    }
}
