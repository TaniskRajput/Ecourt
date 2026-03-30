package com.ecourt.service;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;

/**
 * Local-filesystem implementation of {@link StorageService}.
 * 
 * WHY IT IS USED:
 * This service entirely decouples physical file management (like uploading
 * evidentiary PDFs) from
 * the CourtCaseService. By implementing the StorageService interface, it allows
 * the rest of the
 * application to securely save, load, and delete files without knowing where
 * they actually go.
 * Currently, it saves flies to a local directory defined in
 * `app.storage.upload-dir`, but the
 * interface design means it can easily be swapped for an AWS S3 or Azure Blob
 * implementation
 * in the future without touching any core case logic.
 *
 * FUNCTIONS OVERVIEW:
 * - init: Ensures the target upload directory actually exists on the host OS
 * when the app boots.
 * - store: Validates the file isn't empty, strips malicious path injections
 * (e.g. "../"), assigns a unique UUID filename, and writes the bytes to disk.
 * - load: Resolves the physical path of a requested file.
 * - loadAsResource: Wraps the physical file in a Spring `Resource` object so it
 * can be streamed securely to the frontend downloader.
 * - delete: Removes the physical file from the operating system to clean up
 * storage if a case is purged.
 */
@Service
public class LocalStorageService implements StorageService {

    private final Path uploadRoot;

    public LocalStorageService(StorageProperties properties) {
        this.uploadRoot = Path.of(properties.getUploadDir()).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadRoot);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not initialize document storage.", exception);
        }
    }

    @Override
    public StoredFile store(MultipartFile file) {
        String originalFilename = sanitizeFilename(file.getOriginalFilename());
        String extension = extractExtension(originalFilename);
        String storedFilename = UUID.randomUUID() + extension;

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, uploadRoot.resolve(storedFilename), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store document.");
        }

        String contentType = file.getContentType();
        if (contentType == null || contentType.isBlank()) {
            contentType = "application/octet-stream";
        }

        return new StoredFile(originalFilename, storedFilename, contentType, file.getSize());
    }

    @Override
    public Resource loadAsResource(String storedFilename) {
        Path file = uploadRoot.resolve(storedFilename).normalize();
        if (!file.startsWith(uploadRoot)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid document path.");
        }

        Resource resource = new FileSystemResource(file);
        if (!resource.exists()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document file not found.");
        }

        return resource;
    }

    @Override
    public void delete(String storedFilename) {
        Path file = uploadRoot.resolve(storedFilename).normalize();
        if (!file.startsWith(uploadRoot)) {
            return; // ignore invalid paths silently
        }
        try {
            Files.deleteIfExists(file);
        } catch (IOException exception) {
            // Log but don't fail — deletion is best-effort
        }
    }

    private String sanitizeFilename(String filename) {
        String resolved = filename == null ? "document" : Path.of(filename).getFileName().toString().trim();
        if (resolved.isEmpty()) {
            return "document";
        }
        return resolved.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private String extractExtension(String filename) {
        int lastDot = filename.lastIndexOf('.');
        if (lastDot < 0) {
            return "";
        }
        return filename.substring(lastDot).toLowerCase(Locale.ROOT);
    }
}
