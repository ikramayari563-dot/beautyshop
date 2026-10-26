package com.beautyshop.repository;
import com.beautyshop.model.Order;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
public interface OrderRepository extends MongoRepository<Order, String> {
  List<Order> findByUserEmailOrderByCreatedAtDesc(String email);
  List<Order> findAllByOrderByCreatedAtDesc(); boolean existsByUserEmail(String email);
}
