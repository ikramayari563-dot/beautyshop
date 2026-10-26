package com.beautyshop.repository;
import com.beautyshop.model.Message;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
public interface MessageRepository extends MongoRepository<Message, String> {
  List<Message> findByConversationIdOrderByCreatedAtAsc(String id);
}
