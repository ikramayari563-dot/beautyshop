package com.beautyshop.repository;
import com.beautyshop.model.Product;
import org.springframework.data.mongodb.repository.MongoRepository;
public interface ProductRepository extends MongoRepository<Product, String> { boolean existsByCategoryId(String id); }
