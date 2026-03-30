package com.ecourt.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

/**
 * Abstraction for document storage backends.
 * <p>
 * The default implementation ({@link LocalStorageService}) stores files on the
 * local filesystem. Future implementations can target S3, Azure Blob Storage,
 * GCS, or any other object store without changing the rest of the application.
 */
public interface StorageService {

    /**
     * Store a file and return metadata about the stored object.
     */
    StoredFile store(MultipartFile file);

    /**
     * Load a previously stored file as a Spring {@link Resource}.
     */
    Resource loadAsResource(String storedFilename);

    /**
     * Delete a previously stored file. Implementations should be idempotent —
     * deleting a file that does not exist should not throw.
     */
    void delete(String storedFilename);

    /**
     * Metadata returned after a successful store operation.
     */
    record StoredFile(
            String originalFilename,
            String storedFilename,
            String contentType,
            long sizeBytes) {
    }
}
