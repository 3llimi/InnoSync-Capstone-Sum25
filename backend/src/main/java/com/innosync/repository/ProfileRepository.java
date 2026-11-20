package com.innosync.repository;

import com.innosync.model.Profile;
import com.innosync.model.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public interface ProfileRepository extends JpaRepository<Profile, Long> {
    // static final Logger logger = LoggerFactory.getLogger(ProfileRepository.class); // Uncomment if you want to log in default methods
    Optional<Profile> findByUser(User user);

    /**
     * All profiles with their user joined in, instead of one extra query per profile (the N+1 problem).
     * Technologies are then loaded for all profiles in one batched query
     * (hibernate.default_batch_fetch_size), which keeps each person's skills in the order they entered them.
     */
    @EntityGraph(attributePaths = {"user"})
    @Query("select p from Profile p")
    List<Profile> findAllWithUser();
}
