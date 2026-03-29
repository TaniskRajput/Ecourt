package com.ecourt.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;

@Service
public class DocumentStorageService {

    private final Path uploadRoot;

    public DocumentStorageService(@Value("${app.storage.upload-dir}") String uploadDir) {
        this.uploadRoot = Path.of(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadRoot);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not initialize document storage.", exception);
        }
    }

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

    public record StoredFile(
            String originalFilename,
            String storedFilename,
            String contentType,
            long sizeBytes
    ) {
    }
}
