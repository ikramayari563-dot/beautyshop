package com.beautyshop.repository;
import com.beautyshop.model.Category;
import org.springframework.data.mongodb.repository.MongoRepository;
public interface CategoryRepository extends MongoRepository<Category, String> {}
