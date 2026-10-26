package com.beautyshop.repository;
import com.beautyshop.model.Conversation;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
public interface ConversationRepository extends MongoRepository<Conversation, String> {
  List<Conversation> findByMemberEmailsContainingOrderByLastAtDesc(String email);
}
