package com.ecourt.repository;

import com.ecourt.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findTop20ByRecipientUsernameOrderByCreatedAtDesc(String recipientUsername);

    List<Notification> findByRecipientUsernameAndIsReadFalse(String recipientUsername);

    long countByRecipientUsernameAndIsReadFalse(String recipientUsername);
}
