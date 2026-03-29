package com.ecourt.repository;

import com.ecourt.model.CourtCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface CourtCaseRepository extends JpaRepository<CourtCase, Long>, JpaSpecificationExecutor<CourtCase> {

    Optional<CourtCase> findByCaseNumber(String caseNumber);

    List<CourtCase> findByLawyerUsername(String lawyerUsername);

    List<CourtCase> findByClientUsername(String clientUsername);

    List<CourtCase> findByJudgeUsername(String judgeUsername);
}
