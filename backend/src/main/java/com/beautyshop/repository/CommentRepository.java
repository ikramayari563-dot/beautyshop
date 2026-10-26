package com.beautyshop.repository;
import com.beautyshop.model.Comment;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
public interface CommentRepository extends MongoRepository<Comment, String> {
  List<Comment> findByProductIdAndStatus(String productId, String status);
  List<Comment> findByStatus(String status);
}
