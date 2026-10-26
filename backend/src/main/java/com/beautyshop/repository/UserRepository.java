package com.beautyshop.repository;
import com.beautyshop.model.*;
import java.util.*;
import org.springframework.data.mongodb.repository.MongoRepository;
public interface UserRepository extends MongoRepository<User, String> {
  Optional<User> findByEmail(String email);
  Optional<User> findByResetToken(String token);
  List<User> findByRole(Role role);
}
