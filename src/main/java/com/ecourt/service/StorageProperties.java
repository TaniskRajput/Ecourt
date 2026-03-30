package com.ecourt.service;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Externalized configuration for document storage.
 * <p>
 * Properties are bound from {@code app.storage.*} in application.properties.
 * <ul>
 * <li>{@code app.storage.upload-dir} — local directory for file uploads
 * (default: {@code uploads})</li>
 * <li>{@code app.storage.provider} — storage backend identifier (default:
 * {@code local}); reserved for future S3/cloud support</li>
 * </ul>
 */
@Component
@ConfigurationProperties(prefix = "app.storage")
public class StorageProperties {

    private String uploadDir = "uploads";
    private String provider = "local";

    public String getUploadDir() {
        return uploadDir;
    }

    public void setUploadDir(String uploadDir) {
        this.uploadDir = uploadDir;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }
}
