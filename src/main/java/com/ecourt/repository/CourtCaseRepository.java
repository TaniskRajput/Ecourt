package com.ecourt.repository;

import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.ecourt.model.CourtCase;

public interface CourtCaseRepository extends JpaRepository<CourtCase, Long> {

    Optional<CourtCase> findByCaseNumber(String caseNumber);

    List<CourtCase> findByLawyerUsername(String lawyerUsername);
}
