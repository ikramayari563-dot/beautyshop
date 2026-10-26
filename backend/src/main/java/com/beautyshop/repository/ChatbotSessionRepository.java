package com.beautyshop.repository;
import com.beautyshop.model.ChatbotSession;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
public interface ChatbotSessionRepository extends MongoRepository<ChatbotSession, String> {
  List<ChatbotSession> findByUserEmailOrderByCreatedAtDesc(String email);
}
