package com.innosync.repository;

import com.innosync.model.Notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Query("select n from Notification n where n.recipient.id = :userId order by n.createdAt desc, n.id desc")
    List<Notification> findLatest(@Param("userId") Long userId, Pageable page);

    long countByRecipientIdAndReadFalse(Long recipientId);

    Optional<Notification> findByIdAndRecipientId(Long id, Long recipientId);

    @Modifying
    @Query("update Notification n set n.read = true where n.recipient.id = :userId and n.read = false")
    int markAllRead(@Param("userId") Long userId);

    @Modifying
    @Query("delete from Notification n where n.projectId = :projectId")
    int deleteByProjectId(@Param("projectId") Long projectId);
}
